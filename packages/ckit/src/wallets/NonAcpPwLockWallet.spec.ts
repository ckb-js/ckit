import { TestProvider } from '../__tests__/TestProvider';
import { InternalNonAcpPwLockSigner } from './NonAcpPwLockWallet';

test('internal signer', () => {
  const provider = new TestProvider();
  const signer = new InternalNonAcpPwLockSigner(
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    provider,
  );

  const ethAddress = signer.getEthAddress();
  expect(ethAddress).toBe('0x46a23e25df9a0f6c18729dda9ad1af3b6a131160');
});
