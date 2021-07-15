import { Script } from '@ckb-lumos/base';
import { BigNumber } from 'bignumber.js';
import { MercuryClient } from './sdks/MercuryClient';
import { Secp256k1SudtMintBuilder, SudtMintMercuryProvider } from './tx-builders/Secp256k1SudtMintBuilder';

test('example test', () => {
  expect(1 + 1).toEqual(2);
  expect(1 + 2).not.toEqual(2);
});

test('example test with async', async () => {
  const fakeScript: Script = { args: '', code_hash: '', hash_type: 'data' };

  const builder = new Secp256k1SudtMintBuilder(
    { amount: new BigNumber('1'), sudt: fakeScript, to: fakeScript },
    new SudtMintMercuryProvider(fakeScript, new MercuryClient()),
  );

  await expect(() => builder.build()).rejects.toThrow();
});
