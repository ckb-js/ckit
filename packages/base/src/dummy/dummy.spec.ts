import { DummyWallet, ExtendedDummyWallet } from './DummyWallet';

const asyncSleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('test the dummy wallet', async () => {
  const wallet = new DummyWallet();

  expect(wallet.descriptor.name).toBe('DummyWallet');

  expect(wallet.checkSupported('issue-sudt')).toBe(false);
  expect(wallet.checkSupported('acp')).toBe(false);
  expect(wallet.checkSupported('unknown-feature')).toBe(false);
  expect(wallet.checkSupported('dummy')).toBe(true);

  const onConnectStatusChanged = jest.fn();
  const onSignerChanged = jest.fn();

  wallet.on('connectStatusChanged', onConnectStatusChanged);
  wallet.on('signerChanged', onSignerChanged);

  wallet.connect();
  // cannot reconnect
  expect(() => wallet.connect()).toThrow(/reconnect/);

  await asyncSleep(600);
  expect(onConnectStatusChanged).toHaveBeenCalledWith('connecting');
  expect(onConnectStatusChanged).toHaveBeenCalledWith('connected');

  const signer = wallet.getSigner();
  const address = await signer?.getAddress();
  expect(address && address.length > 0).toBe(true);

  wallet.disconnect();
  await asyncSleep(50);
  expect(onConnectStatusChanged).toHaveBeenCalledWith('disconnected');

  expect(onConnectStatusChanged).toHaveBeenCalledTimes(3);
});

test('extended dummy wallet', () => {
  const wallet = new ExtendedDummyWallet();

  expect(wallet.descriptor.name).toBe('ExtendedDummyWallet');
  expect(wallet.checkSupported('unknown-feature')).toBe(true);
  expect(wallet.checkSupported('dummy')).toBe(true);
});
