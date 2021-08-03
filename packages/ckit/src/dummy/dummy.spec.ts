import { asyncSleep } from '../utils';
import { DummyWallet } from '.';

test('test the dummy wallet', async () => {
  const wallet = new DummyWallet();

  expect(wallet.name).toBe('DummyWallet');

  expect(wallet.checkSupported('issue-sudt')).toBe(false);
  expect(wallet.checkSupported('acp')).toBe(false);
  expect(wallet.checkSupported('unknown-feature')).toBe(false);

  const onConnectStatusChanged = jest.fn();
  const onSignerChanged = jest.fn();

  wallet.on('connectStatusChanged', onConnectStatusChanged);
  wallet.on('signerChanged', onSignerChanged);

  wallet.connect();

  await asyncSleep(600);
  expect(onConnectStatusChanged).toHaveBeenCalledWith('connecting');
  expect(onConnectStatusChanged).toHaveBeenCalledWith('connected');

  const signer = wallet.getSigner();
  const address = await signer?.getAddress();
  expect(address != null && typeof address === 'string' && address.length > 0).toBe(true);

  wallet.disconnect();
  await asyncSleep(50);
  expect(onConnectStatusChanged).toHaveBeenCalledWith('disconnected');

  expect(onConnectStatusChanged).toHaveBeenCalledTimes(3);
});
