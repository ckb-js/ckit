import { UnipassWallet, CkitProvider, UnipassAdapterConfig } from '@ckitjs/ckit';
import { makeObservable, observable } from 'mobx';

export class ObservableUnipassWallet extends UnipassWallet {
  constructor(provider: CkitProvider, adapterConfig?: UnipassAdapterConfig) {
    super(provider, adapterConfig);
    this.setDescriptor({ name: 'UniPass' });
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
    });
  }
}
