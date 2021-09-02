// hex string without 0x
type ByteString = string;

// string starts with 0x
type HexString = string;

export type CanConvertToHex = Buffer | ByteString | HexString | number | bigint;

export function concat(...hexes: CanConvertToHex[]): HexString {
  return '0x' + hexes.map(padToEven).join('');
}

/**
 * pad a big-endian string to even length
 * @param x
 */
function padToEven(x: CanConvertToHex): ByteString {
  x = rm0x(toHex(x));

  if (x.length % 2 !== 0) x = '0' + x;

  return x;
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

  throw new Error(`Cannot parse ${x} to a hex string`);
}
