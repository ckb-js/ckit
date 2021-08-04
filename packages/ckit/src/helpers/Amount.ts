import { BigNumber } from 'bignumber.js';

export type HumanizeOptions = { decimalPlaces?: number; separator?: boolean };

export class Amount {
  /**
   * value without decimals
   * @private
   */
  private val: BigNumber;

  protected constructor(value: BigNumber.Value, private decimals = 0) {
    this.val = new BigNumber(value);
  }

  humanize(options?: HumanizeOptions): string {
    const { decimalPlaces = Infinity, separator = true } = options ? options : {};

    const valWithDecimals = this.val.times(10 ** -this.decimals);
    const originDecimalPlaces = valWithDecimals.decimalPlaces();

    const rounded = valWithDecimals.decimalPlaces(Math.min(originDecimalPlaces, decimalPlaces), BigNumber.ROUND_FLOOR);

    if (separator) return rounded.toFormat();
    return rounded.toString();
  }

  setVal(value: BigNumber.Value | ((val: BigNumber) => BigNumber)): this {
    if (typeof value === 'function') {
      this.val = value(this.val);
      return this;
    }

    this.val = new BigNumber(value);
    return this;
  }

  toString(base?: number): string {
    return this.val.toString(base);
  }

  toHex(): string {
    return '0x' + this.toString(16);
  }

  equals(another: BigNumber.Value | Amount): boolean {
    if (another instanceof Amount) return another.toString() === this.toString();
    return this.toString() === new BigNumber(another).toString();
  }
}

export class CkbAmount extends Amount {
  protected constructor(value: BigNumber.Value) {
    super(value, 8);
  }

  static fromCkb(value: number): CkbAmount {
    return new CkbAmount(new BigNumber(value).times(10 ** 8));
  }

  static fromShannon(value: BigNumber.Value): CkbAmount {
    return new CkbAmount(value);
  }
}
