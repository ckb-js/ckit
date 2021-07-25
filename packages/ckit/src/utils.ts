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
