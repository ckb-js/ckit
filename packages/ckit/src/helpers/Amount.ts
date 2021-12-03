import { BigNumber } from 'bignumber.js';
import { boom } from '../utils';

export type HumanizeOptions = { decimalPlaces?: number; separator?: boolean; decimals?: number };

type AmountValue = BigNumber.Value | bigint;
type AmountLike = AmountValue | Amount;

export function BN(val: AmountValue | Amount): BigNumber {
  if (typeof val === 'bigint') return new BigNumber(String(val));
  if (Amount.checkIsAmount(val)) return new BigNumber(String(val));
  return new BigNumber(val);
}

export class Amount {
  readonly __isCkitAmount__ = true;

  static checkIsAmount(x: unknown): x is Amount {
    if (typeof x !== 'object') return false;
    if (x == null) return false;

    return '__isCkitAmount__' in x && (x as Amount).__isCkitAmount__;
  }

  /**
   *
   * @param value
   * @param decimals
   * @example
   * ```ts
   * Amount.from(1).eq(1) // true
   * Amount.from(1, 8).eq(1_00000000) // true
   * ```
   */
  static from(value: AmountValue, decimals = 0): Amount {
    if (decimals < 0 || !Number.isInteger(decimals)) boom('The decimal not valid');

    if (typeof value === 'bigint') return new Amount(BN(value * BigInt(10) ** BigInt(decimals)));
    if (!decimals) return new Amount(BN(value));

    return new Amount(BN(value).times(BN(10).pow(decimals)));
  }

  /**
   * value without decimals
   * @private
   */
  private readonly raw: BigNumber;

  protected constructor(bn: BigNumber) {
    if (!bn.isInteger()) throw new Error('Amount must be an integer');
    if (bn.lt(0)) throw new Error('Amount must cannot be a negative number');
    this.raw = new BigNumber(bn);
  }

  humanize(options?: HumanizeOptions): string {
    const { decimalPlaces = Infinity, separator = true, decimals = 0 } = options ? options : {};

    const valWithDecimals = this.raw.times(BN(10).pow(-decimals));
    const originDecimalPlaces = valWithDecimals.decimalPlaces();

    const rounded = valWithDecimals.decimalPlaces(Math.min(originDecimalPlaces, decimalPlaces), BigNumber.ROUND_FLOOR);

    if (separator) return rounded.toFormat();
    return rounded.toString();
  }

  protected new(val: BigNumber): Amount {
    return new Amount(val);
  }

  toString(base?: number): string {
    return this.raw.toString(base);
  }

  toHex(): string {
    return '0x' + this.toString(16);
  }

  eq(val: AmountLike): boolean {
    return this.raw.eq(BN(val));
  }

  gt(val: AmountLike): boolean {
    return this.raw.gt(BN(val));
  }

  gte(val: AmountLike): boolean {
    return this.raw.gte(BN(val));
  }

  lt(val: AmountLike): boolean {
    return this.raw.lt(BN(val));
  }

  lte(val: AmountLike): boolean {
    return this.raw.lte(BN(val));
  }

  plus(val: AmountLike): Amount {
    return this.new(this.raw.plus(BN(val)));
  }

  minus(val: AmountLike): Amount {
    return this.new(this.raw.minus(BN(val)));
  }

  asBN(): BigNumber {
    return new BigNumber(this.raw);
  }
}

type CkbHumanizeOptions = { decimalPlaces?: number; separator?: boolean };

export class CkbAmount extends Amount {
  /**
   * @deprecated
   */
  static from(): never {
    throw new Error('Use the Amount.from to instead of');
  }

  static fromCkb(value: AmountValue): CkbAmount {
    return new CkbAmount(BN(value).times(10 ** 8));
  }

  static fromShannon(value: AmountValue): CkbAmount {
    return new CkbAmount(BN(value));
  }

  protected override new(val: BigNumber): CkbAmount {
    return new CkbAmount(val);
  }

  humanize(options?: CkbHumanizeOptions): string {
    return super.humanize({ ...options, decimals: 8 });
  }
}
