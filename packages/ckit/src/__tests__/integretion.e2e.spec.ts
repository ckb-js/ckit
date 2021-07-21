import { Address } from '@ckb-lumos/base';
import { RPC } from '@ckb-lumos/rpc';
import { BigNumber } from 'bignumber.js';
import { CkbTypeScript, Signer, Wallet } from '../interfaces';
import { MercuryProvider } from '../providers/MercuryProvider';
import { MintOptions, PwSudtMintBuilder } from '../tx-builders/PwSudtMintBuilder';
import { unimplemented } from '../utils';

function createWallet(): Wallet {
  unimplemented();
}

function createProvider(): MercuryProvider {
  unimplemented();
}

function createTxBuilder(_options: MintOptions): PwSudtMintBuilder {
  unimplemented();
}

function setupTest(): { from: Address; recipient: Address; sudt: CkbTypeScript } {
  unimplemented();
}

test.skip('', async () => {
  const { from, recipient, sudt } = setupTest();

  const provider = createProvider();
  const wallet = createWallet();
  wallet.connect();

  const signer = await new Promise<Signer>((resolve) => {
    wallet.on('signerChanged', resolve);
  });

  const address = await signer.getAddress();

  // TODO
  expect(address).toEqual('');

  const mintAmount = '0x111';
  const rawTx = await createTxBuilder({ issuer: from, recipients: [] }).build();

  const signed = await signer.sign(rawTx);
  const rpc = new RPC('');

  const recipientBalance0 = await provider.getUdtBalance(recipient, sudt);
  const startBlock = await provider.getBlockNumber();
  await rpc.send_transaction(signed);

  while ((await provider.getBlockNumber()) === startBlock) {
    // wait until next block
  }
  const recipientBalance1 = await provider.getUdtBalance(recipient, sudt);
  expect(new BigNumber(recipientBalance0).plus(mintAmount).eq(recipientBalance1));
});
