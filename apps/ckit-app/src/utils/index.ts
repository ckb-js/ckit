import { BigNumber } from 'bignumber.js';

export function hasProp<O, K extends string | number | symbol>(obj: O, key: K): obj is Record<K, unknown> & O {
  return obj != null && typeof obj === 'object' && key in obj;
}

export function humanizeAssetAmount(amount: string, precison: number): string {
  const bigNumber = new BigNumber(amount);
  const amountWithDecimals = bigNumber.times(10 ** -precison);
  const originDecimalPlaces = amountWithDecimals.decimalPlaces();
  const rounded = amountWithDecimals.decimalPlaces(originDecimalPlaces, BigNumber.ROUND_FLOOR);
  return rounded.toFormat().toString();
}
