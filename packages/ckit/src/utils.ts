import { HexString } from '@ckb-lumos/base';

export function unimplemented(): never {
  throw new Error('unimplemented');
}

export function asyncSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 *
 * @param lengthWithOut0x expected length does not contain the beginning 0x
 * @example
 * ```ts
 * randomHexString(1); // 0xa
 * randomHexString(1); // 0x2
 * randomHexString(2); // 0xf8
 * ```
 */
export function randomHexString(lengthWithOut0x: number): HexString {
  return '0x' + [...Array(lengthWithOut0x)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function nonNullable<X>(x: X): NonNullable<X> {
  if (x == null) throw new Error('Null check failed');
  return x as NonNullable<X>;
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToBytes(hex: HexString): Uint8Array {
  hex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const match = hex.match(/.{1,2}/g);
  if (!match) throw new Error(`cannot parse ${hex} into Uint8Array`);

  return Uint8Array.from(match.map((byte) => parseInt(byte, 16)));
}

export function boom(message?: string): never {
  throw new Error(message);
}

export function asserts(condition: unknown, err?: string | Error | (() => never) | (() => Error)): asserts condition {
  if (condition) return;
  if (typeof err === 'function') {
    throw err();
  }
  if (typeof err === 'string') boom(err);
  if (err instanceof Error) throw err;

  boom();
}
