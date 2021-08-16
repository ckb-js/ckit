import { BigNumber } from 'bignumber.js';

export class AssetAmount {
  rawAmount: BigNumber;
  decimals: number;

  constructor(rawAmount: string | BigNumber, decimals: number) {
    this.rawAmount = new BigNumber(rawAmount);
    this.decimals = decimals;
  }

  static fromRaw(rawAmount: string, decimals: number): AssetAmount {
    return new AssetAmount(rawAmount, decimals);
  }

  static fromHumanize(humanizeAmount: string, decimals: number): AssetAmount {
    const rawAmount = new BigNumber(humanizeAmount).times(10 ** decimals);
    return new AssetAmount(rawAmount, decimals);
  }

  toRawString(): string {
    return this.rawAmount.toString();
  }

  toHexString(): string {
    return '0x' + this.rawAmount.toString(16);
  }

  toHumanizeString(): string {
    const humanizeAmount = this.rawAmount.times(10 ** -this.decimals);
    const originDecimalPlaces = humanizeAmount.decimalPlaces();
    const rounded = humanizeAmount.decimalPlaces(originDecimalPlaces, BigNumber.ROUND_FLOOR);
    return rounded.toFormat().toString();
  }
}
