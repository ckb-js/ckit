import { Script } from '@ckb-lumos/base';
import { DummyProvider } from './DummyProvider';

// https://github.com/nervosnetwork/ckit/issues/99
describe('convert between address and script', () => {
  const provider = new DummyProvider();
  beforeAll(async () => {
    await provider.init({ MIN_FEE_RATE: '1000', PREFIX: 'ckt', SCRIPTS: {} });
  });

  const script: Script = {
    args: '0xd173313a51f8fc37bcf67569b463abd89d81844f',
    code_hash: '0x58c5f491aba6d61678b7cf7edf4910b1f5e00ec0cde2f42e0abb4fd9aff25a63',
    hash_type: 'type',
  };

  const ckb2019Address =
    'ckt1q3vvtay34wndv9nckl8hah6fzzcltcqwcrx79apwp2a5lkd07fdx85tnxya9r78ux770vatfk336hkyasxzy7r38glc';

  const ckb2021Address =
    'ckt1qpvvtay34wndv9nckl8hah6fzzcltcqwcrx79apwp2a5lkd07fdxxqw3wvcn550clsmmean4dx6x827cnkqcgncz88uxh';

  test('parse to CKB2019 address from script', () => {
    expect(provider.parseToAddress(script)).toBe(ckb2019Address);
    expect(provider.parseToAddress(script, { version: 'CKB2019' })).toBe(ckb2019Address);
  });

  test('parse to CKB2021 address', () => {
    expect(provider.parseToAddress(script, { version: 'CKB2021' })).toBe(ckb2021Address);
  });

  test('parse to script from CKB2021 address ', () => {
    expect(provider.parseToScript(ckb2021Address)).toEqual(script);
  });

  test('parse to script from CKB2019 address', () => {
    expect(provider.parseToScript(ckb2019Address)).toEqual(script);
  });
});
