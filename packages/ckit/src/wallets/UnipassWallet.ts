import { HexString, Transaction } from '@ckb-lumos/base';
import { AbstractWallet } from '@ckitjs/base';
import { CkitProvider } from '../providers';
import { AbstractSingleEntrySigner } from './AbstractSingleEntrySigner';
import { UnipassRedirectAdapter } from './unipass/UnipassAdapter';

export class UnipassWallet extends AbstractWallet {
  static UnipassRedirectAdapter: typeof UnipassRedirectAdapter = UnipassRedirectAdapter;

  private adapter: UnipassRedirectAdapter;

  constructor(private provider: CkitProvider) {
    super();
    this.setDescriptor({
      name: 'UnipassWallet',
      description: 'Interacting with CKB via an Email',
      features: ['acp'],
    });

    // TODO check the network and choose a right UniPass host
    this.adapter = new UnipassRedirectAdapter({ host: 'https://unipass.xyz', loginDataCacheKey: '__unipass__' });
  }

  protected async tryConnect(): Promise<AbstractSingleEntrySigner> {
    const unipassLockArgs = await this.adapter.getLockArgs();
    const provider = this.provider;

    const getAddress = () => {
      return Promise.resolve(provider.parseToAddress(provider.newScript('UNIPASS', unipassLockArgs)));
    };

    const signMessage = (message: HexString): Promise<HexString> => {
      return Promise.resolve(this.adapter.sign(message));
    };

    return new (class extends AbstractSingleEntrySigner {
      getAddress(): Promise<string> {
        return getAddress();
      }

      signMessage(message: HexString): Promise<HexString> {
        return signMessage(message);
      }

      override seal(tx: unknown): Promise<Transaction> {
        return super.seal(tx);
      }
    })({ provider: this.provider });
  }
}
