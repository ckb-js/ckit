import { HexString, Transaction } from '@ckb-lumos/base';
import { AbstractWallet } from '@ckitjs/base';
import { CkitProvider } from '../providers';
import { AbstractSingleEntrySigner } from './AbstractSingleEntrySigner';
import { AdapterConfig, UnipassRedirectAdapter } from './unipass/UnipassAdapter';

export class UnipassWallet extends AbstractWallet {
  static UnipassRedirectAdapter: typeof UnipassRedirectAdapter = UnipassRedirectAdapter;

  readonly adapter: UnipassRedirectAdapter;

  constructor(private provider: CkitProvider, adapterConfig?: AdapterConfig) {
    super();
    this.setDescriptor({
      name: 'UnipassWallet',
      description: 'Interacting with CKB via an Email',
      features: ['acp'],
    });

    this.adapter = new UnipassRedirectAdapter(adapterConfig ?? {});
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
