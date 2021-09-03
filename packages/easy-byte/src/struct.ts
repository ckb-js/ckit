import { formatByteLike } from './utils';

function createReader<T>(fnName: keyof Buffer): (buf: Buffer, offset?: number) => T {
  return function (buf: Buffer, offset = 0) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return buf[fnName](offset);
  };
}

function createWriter<T>(fnName: keyof Buffer): (buf: Buffer, val: T, offset?: number) => void {
  return function (buf: Buffer, val, offset = 0) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    buf[fnName](val, offset);
  };
}

type Reader<T = number> = (buf: Buffer, offset?: number) => T;
type Writer<T = number> = (buf: Buffer, val: T, offset?: number) => void;

export interface Field<T = number> {
  byteWidth: number;
  read: Reader<T>;
  write: Writer<T>;
}

export function createField<T>(byteWidth: number, read: Reader<T>, write: Writer<T>): Field<T> {
  return { byteWidth, read, write };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NamedField<T = any, K extends string = string> = [K, Field<T>];

export interface Struct<S> {
  readonly fields: NamedField[];
  readonly byteWidth: number;
  field: <Name extends string, T>(name: Name, type: Field<T>) => Struct<S & { [K in Name]: T }>;
  decode: (buf: Buffer) => S;
  encode: (obj: S) => Buffer;
}

export class FixedStruct<T> implements Struct<T> {
  readonly fields: NamedField[];
  readonly byteWidth: number;

  constructor(fields: NamedField[] = []) {
    this.fields = fields;
    this.byteWidth = fields.reduce((width, field) => width + field[1].byteWidth, 0);
  }

  field<Name extends string, F>(name: Name, field: Field<F>): Struct<T & Record<Name, F>> {
    const namedField: NamedField = [name, field];
    return new FixedStruct(this.fields.concat([namedField])) as Struct<T & Record<Name, F>>;
  }

  decode(buf: Buffer): T {
    const result = {} as T;

    let offset = 0;
    this.fields.forEach(([name, field]) => {
      const parsed = field.read(buf, offset);
      offset += field.byteWidth;
      result[name as keyof T] = parsed;
    });

    return result;
  }

  encode(obj: T): Buffer {
    const byteSize = this.fields.reduce((size, [, field]) => field.byteWidth + size, 0);
    const buf = Buffer.alloc(byteSize);

    let offset = 0;
    this.fields.forEach(([name, field]) => {
      field.write(buf, obj[name as keyof T], offset);
      offset += field.byteWidth;
    });

    return buf;
  }
}

function bigIntReader(byteSize: number, le?: boolean, signed?: boolean): Reader<bigint> {
  return function (buf: Buffer, offset = 0) {
    const byteString = formatByteLike(buf.slice(offset, offset + byteSize), {
      byteSize,
      // when the bytes are marked as little endian,
      // in order to parse the bytes as the correct BigInt,
      // the bytes need to be reversed to big endian
      convertEndian: le,
      // padding a 0x to ensure that it is considered by BigInt as hexadecimal
      pad0x: true,
    });
    const val = BigInt(byteString);
    if (!signed) return val;

    const signMask = 1n << BigInt(byteSize * 8 - 1);
    const valueMask = signMask - 1n;

    if ((signMask & val) === 0n) return val;
    return (valueMask & val) - signMask;
  };
}

function bigIntWriter(byteSize: number, le?: boolean, signed?: boolean): Writer<bigint> {
  return function (buf: Buffer, input: bigint, offset = 0) {
    let val = input;
    if (signed && val < 0n) val = (1n << BigInt(byteSize * 8)) + val;

    const byteString = formatByteLike(val.toString(16), { byteSize, convertEndian: le });
    buf.write(byteString, offset, 'hex');
  };
}

export const I8 = createField<number>(1, createReader('readInt8'), createWriter('writeInt8'));
export const U8 = createField<number>(1, createReader('readUInt8'), createWriter('writeUInt8'));

export const I16LE = createField<number>(2, createReader('readInt16LE'), createWriter('writeInt16LE'));
export const I16BE = createField<number>(2, createReader('readInt16BE'), createWriter('writeInt16BE'));
export const U16LE = createField<number>(2, createReader('readUInt16LE'), createWriter('writeUInt16LE'));
export const U16BE = createField<number>(2, createReader('readUInt16BE'), createWriter('writeUInt16BE'));

export const I32LE = createField<number>(4, createReader('readInt32LE'), createWriter('writeInt32LE'));
export const I32BE = createField<number>(4, createReader('readInt32BE'), createWriter('writeInt32BE'));
export const U32LE = createField<number>(4, createReader('readUInt32LE'), createWriter('writeUInt32LE'));
export const U32BE = createField<number>(4, createReader('readUInt32BE'), createWriter('writeUInt32BE'));

export const I64LE = createField<bigint>(8, createReader('readBigInt64LE'), createWriter('writeBigInt64LE'));
export const I64BE = createField<bigint>(8, createReader('readBigInt64BE'), createWriter('writeBigInt64BE'));
export const U64LE = createField<bigint>(8, createReader('readBigUInt64LE'), createWriter('writeBigUInt64LE'));
export const U64BE = createField<bigint>(8, createReader('readBigUInt64BE'), createWriter('writeBigUInt64BE'));

export const I128LE = createField<bigint>(16, bigIntReader(16, true, true), bigIntWriter(16, true, true));
export const I128BE = createField<bigint>(16, bigIntReader(16, false, true), bigIntWriter(16, false, true));
export const U128LE = createField<bigint>(16, bigIntReader(16, true, false), bigIntWriter(16, true, false));
export const U128BE = createField<bigint>(16, bigIntReader(16, false, false), bigIntWriter(16, false, false));

/**
 * Create a coder for a fixed-length byte
 * that can easily convert a string of bytes into a plain JS object
 * @example
 * ```typescript
 * const struct = createFixedStruct()
 *  .field('messageType', U8)
 *  .field('messageContent', U64);
 *
 * const parsed = struct.decode(Buffer.from('...'))
 * console.log(parsed) // { messageType: 0, messageContent: ...}
 * ```
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function createFixedStruct(): FixedStruct<{}> {
  return new FixedStruct();
}
