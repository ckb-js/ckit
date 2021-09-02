import { formatByteLike, convertEndian, pad0x, prependZeroToEvenLength, pipe, rm0x, toBuffer } from './utils';

test('pipe formatByteLike', () => {
  expect(pipe(formatByteLike)('0x')).toEqual('0x');
  expect(pipe(formatByteLike, rm0x)('0x')).toEqual('');
  expect(pipe(formatByteLike, rm0x, rm0x, pad0x, pad0x)('0x')).toEqual('0x');

  expect(formatByteLike('0x', { rm0x: true })).toEqual('');
  expect(formatByteLike('0x11', { rm0x: true })).toEqual('11');
  expect(formatByteLike('0x11', { rm0x: true, byteSize: 2 })).toEqual('0011');
  expect(formatByteLike('0x11', { rm0x: true, byteSize: 2, convertEndian: true })).toEqual('1100');

  expect(formatByteLike('0x010', { le: true })).toEqual('0x0100');
  expect(formatByteLike('0x0100', { le: true })).toEqual('0x0100');
  expect(formatByteLike('0x010', { le: true, byteSize: 8 })).toEqual('0x0100000000000000');

  expect(pipe(formatByteLike, rm0x, convertEndian)('0x01020304')).toEqual('04030201');
  expect(pipe(formatByteLike, rm0x, convertEndian)('')).toEqual('');

  expect(pipe(rm0x, prependZeroToEvenLength, convertEndian, pad0x)('0x001020304')).toEqual('0x0403020100');

  expect(pipe(formatByteLike, toBuffer)('')).toEqual(Buffer.from([]));
  expect(pipe(formatByteLike, toBuffer)('10')).toEqual(Buffer.from([0x10]));
});

function wrap(bytes: number[]): Buffer {
  return Buffer.from(bytes);
}

test('parse string to Buffer', () => {
  expect(toBuffer('')).toEqual(wrap([]));
  expect(toBuffer('', 0)).toEqual(wrap([]));
  expect(toBuffer('', 1)).toEqual(Buffer.alloc(1));

  expect(toBuffer('0000')).toEqual(wrap([0, 0]));
  expect(toBuffer('0000', 1)).toEqual(wrap([0]));
  expect(toBuffer('0000', 2)).toEqual(wrap([0, 0]));
  expect(toBuffer('0000', 4)).toEqual(wrap([0, 0, 0, 0]));
  expect(toBuffer('0101')).toEqual(wrap([1, 1]));
  expect(toBuffer('0101', 3)).toEqual(wrap([0, 1, 1]));
});

test('parse Buffer to Buffer', () => {
  expect(toBuffer(wrap([0]))).toEqual(wrap([0]));
  expect(toBuffer(wrap([0]), 2)).toEqual(wrap([0, 0]));
  expect(toBuffer(wrap([1, 0, 1]), 2)).toEqual(wrap([0, 1]));
});
