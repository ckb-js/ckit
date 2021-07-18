import { Signer, Wallet } from '../interfaces';
import { asyncSleep } from '../utils';
import { Secp256k1LockWallet } from '../wallets';

test.skip('test wallet', async () => {
  const wallet: Wallet = new Secp256k1LockWallet();
  const connectStatusChanged = jest.fn();
  const signerChanged = jest.fn<void, Signer[]>();

  wallet.on('connectStatusChanged', connectStatusChanged);
  wallet.on('signerChanged', signerChanged);

  wallet.connect();

  await asyncSleep(300);

  expect(connectStatusChanged).toHaveBeenCalledWith('connecting');
  expect(connectStatusChanged).toHaveBeenCalledWith('connected');

  // TODO mock the address
  await expect(signerChanged.mock.calls?.[0]?.[0]?.getAddress()).resolves.toEqual('');
});
