import { CkbAmount } from './Amount';

test('test CkbAmount', () => {
  const amount = CkbAmount.fromCkb(1);

  expect(amount.toString()).toBe('100000000');
  expect(String(CkbAmount.fromCkb(1))).toBe('100000000');

  // with mutate
  // plus 1 shannon
  amount.setVal((x) => x.plus(1));
  expect(amount.toString()).toBe('100000001');
  expect(amount.humanize()).toBe('1.00000001');
  expect(amount.humanize({ decimalPlaces: 4 })).toBe('1');

  // test from shannon
  expect(CkbAmount.fromShannon(1).toString()).toBe('1');
  // 1 shannon + 1 ckb
  expect(
    CkbAmount.fromShannon(1)
      .setVal((x) => x.plus(CkbAmount.fromCkb(1).toString()))
      .toString(),
  ).toBe('100000001');
});
