import JSBI from 'jsbi';
import {
  createFixedStruct,
  U64LE,
  U8,
  U128LE,
  Field,
  U128BE,
  I128LE,
  I128BE,
  U64LEJSBI,
  U128LEJSBI,
  U128BEJSBI,
  U64BEJSBI,
} from './struct';

function testReadAndWrite<T>(field: Field<T>, buffer: Buffer, x: T) {
  expect(field.read(buffer)).toEqual(x);

  const bufferToWrite = Buffer.alloc(field.byteWidth);
  field.write(bufferToWrite, x);
  expect(bufferToWrite).toEqual(buffer);
}

it('builtin types reading and writing bytes should be correct ', () => {
  testReadAndWrite(I128LE, Buffer.alloc(16, 0xff), -1n);
  testReadAndWrite(I128BE, Buffer.alloc(16, 0xff), -1n);
  testReadAndWrite(U128LE, Buffer.alloc(16, 0xff), 0xffffffffffffffffffffffffffffffffn);
  testReadAndWrite(U128BE, Buffer.alloc(16, 0xff), 0xffffffffffffffffffffffffffffffffn);

  testReadAndWrite(I128LE, Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex'), 0x0f0e0d0c0b0a09080706050403020100n);
  testReadAndWrite(I128BE, Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex'), 0x000102030405060708090a0b0c0d0e0fn);
  testReadAndWrite(U128LE, Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex'), 0x0f0e0d0c0b0a09080706050403020100n);
  testReadAndWrite(U128BE, Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex'), 0x000102030405060708090a0b0c0d0e0fn);
});

test('encoding and decoding should be correct', () => {
  const messageStruct = createFixedStruct()
    .field('messageHeader', U8)
    // A value of u64 may exceed MAX_SAFE_INTEGER, so use a bigint to store this value
    .field('messageBody', U64LE)
    .field('extraData', I128BE);

  const struct = {
    messageHeader: 0x01,
    messageBody: 0xffffffffffffffffn, // a bigint
    extraData: 0x00010203n,
  };
  const bytes = Buffer.from('01ffffffffffffffff00000000000000000000000000010203', 'hex');

  const encoded = messageStruct.encode(struct);
  expect(encoded).toEqual(bytes);

  const decoded = messageStruct.decode(bytes);
  expect(decoded).toEqual(struct);
});

test('encoding and decoding jsbi field', () => {
  const codec = createFixedStruct()
    .field('jsbi64le', U64LEJSBI)
    .field('jsbi64be', U64BEJSBI)
    .field('jsbi128le', U128LEJSBI)
    .field('jsbi128be', U128BEJSBI);

  const encoded = codec.encode({
    jsbi64le: JSBI.BigInt('0x0102'),
    jsbi64be: JSBI.BigInt('0x0102'),
    jsbi128le: JSBI.BigInt('0x0102'),
    jsbi128be: JSBI.BigInt('0x0102'),
  });

  expect(
    Buffer.from(
      '020100000000000000000000000001020201000000000000000000000000000000000000000000000000000000000102',
      'hex',
    ),
  ).toEqual(encoded);
});
