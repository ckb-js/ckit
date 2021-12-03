import JSBI from 'jsbi';

// hex string without 0x
type ByteString = string;

// string starts with 0x
type HexString = string;

type NumberLike = Pick<number, 'toString'>;

export type CanConvertToHex = Buffer | ByteString | HexString | number | bigint | NumberLike;

function isNumberLike(x: { toString?: unknown }): x is NumberLike {
  if (typeof x === 'number') return true;
  if (x === null || x === undefined) return false;

  return typeof x?.toString === 'function';
}
/**
 * concat byte-like into a hex string
 *
 * @example
 * concat('00', '01') // 0x0001
 * @param hexes
 */
export function concat(...hexes: CanConvertToHex[]): HexString {
  return '0x' + hexes.map(padToEven).join('');
}

/**
 * pad a big-endian string to even length
 * @param x
 */
function padToEven(x: CanConvertToHex): ByteString {
  let result = rm0x(toHex(x));

  if (result.length % 2 !== 0) result = '0' + x;

  return result;
}

export function rm0x(hexStringLike: string): HexString {
  if (hexStringLike.startsWith('0x')) hexStringLike = hexStringLike.slice(2);

  return hexStringLike;
}

export function toHex(x: CanConvertToHex): HexString {
  if (typeof x === 'number') {
    if (x < 0 || !Number.isInteger(x)) throw new Error(`Cannot parse ${x} to a hex string`);
    return '0x' + x.toString(16);
  }

  if (typeof x === 'string') {
    if (x.startsWith('0x')) return x;
    return '0x' + x;
  }

  if (typeof x === 'bigint') {
    return '0x' + x.toString(16);
  }

  if (Buffer.isBuffer(x)) {
    return '0x' + x.toString('hex');
  }

  if (isNumberLike(x)) {
    return '0x' + JSBI.BigInt(x).toString(16);
  }

  throw new Error(`Cannot parse ${x} to a hex string`);
}
