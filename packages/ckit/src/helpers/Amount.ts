import { BigNumber } from 'bignumber.js';

export type HumanizeOptions = { decimalPlaces?: number; separator?: boolean };

export class Amount {
  static from(value: BigNumber.Value | bigint): Amount {
    if (typeof value === 'bigint') return new Amount(String(value));
    return new Amount(value);
  }

  /**
   * value without decimals
   * @private
   */
  private raw: BigNumber;

  protected constructor(raw: BigNumber.Value, private decimals = 0) {
    this.raw = new BigNumber(raw);
  }

  humanize(options?: HumanizeOptions): string {
    const { decimalPlaces = Infinity, separator = true } = options ? options : {};

    const valWithDecimals = this.raw.times(10 ** -this.decimals);
    const originDecimalPlaces = valWithDecimals.decimalPlaces();

    const rounded = valWithDecimals.decimalPlaces(Math.min(originDecimalPlaces, decimalPlaces), BigNumber.ROUND_FLOOR);

    if (separator) return rounded.toFormat();
    return rounded.toString();
  }

  setVal(value: BigNumber.Value | ((val: BigNumber) => BigNumber)): this {
    if (typeof value === 'function') {
      this.raw = value(this.raw);
      return this;
    }

    this.raw = new BigNumber(value);
    return this;
  }

  toString(base?: number): string {
    return this.raw.toString(base);
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
