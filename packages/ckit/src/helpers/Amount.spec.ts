import { Amount, CkbAmount } from './Amount';

test('test Amount', () => {
  expect(Amount.from(1.23, 8).eq(1_23000000)).toBe(true);
  expect(Amount.from('1.23', 8).eq(1_23000000)).toBe(true);

  expect(CkbAmount.fromCkb(1).toString()).toBe('100000000');
  expect(String(CkbAmount.fromCkb(1))).toBe('100000000');

  // 1 ckb + 1 shannon
  const amount = CkbAmount.fromCkb(1).plus(1);
  expect(amount.toString()).toBe('100000001');
  expect(amount.humanize()).toBe('1.00000001');
  expect(amount.humanize({ decimalPlaces: 4 })).toBe('1');

  // test from shannon
  expect(CkbAmount.fromShannon(1).toString()).toBe('1');
  // 1 shannon + 1 ckb
  expect(CkbAmount.fromShannon(1).plus(CkbAmount.fromCkb(1)).toString()).toBe('100000001');
  expect(CkbAmount.fromCkb(1).plus(CkbAmount.fromCkb(1)).eq(2_00000000)).toBe(true);
  expect(CkbAmount.fromCkb('1.35').eq(1_35000000)).toBe(true);

  expect(() => CkbAmount.fromCkb('1.123456789')).toThrow(); // cannot be a non-integer
  expect(() => CkbAmount.fromShannon(1).minus(1.2)).toThrow();

  expect(CkbAmount.fromCkb('1.12345678').humanize()).toBe('1.12345678');
  expect(CkbAmount.fromCkb(100_000_000).humanize()).toBe('100,000,000');
  expect(CkbAmount.fromCkb(1).minus(1).humanize()).toBe('0.99999999');
  expect(Amount.from(0x174876e800).humanize({ decimals: 4 })).toBe('10000000');

  expect(CkbAmount.fromCkb(1).gt(CkbAmount.fromShannon(1))).toBe(true);
  expect(CkbAmount.fromCkb(1).gt(CkbAmount.fromShannon(1_00000000))).toBe(false);
  expect(CkbAmount.fromCkb(1).gte(CkbAmount.fromShannon(1))).toBe(true);
  expect(CkbAmount.fromCkb(1).gte(CkbAmount.fromShannon(1_00000000))).toBe(true);

  expect(CkbAmount.fromCkb(0).lt(CkbAmount.fromShannon(1))).toBe(true);

  expect(Amount.checkIsAmount(Amount.from(0))).toBe(true);
  expect(Amount.checkIsAmount(CkbAmount.fromShannon(0))).toBe(true);

  // cannot CkbAmount.from
  expect(() => CkbAmount.from()).toThrow();
});
