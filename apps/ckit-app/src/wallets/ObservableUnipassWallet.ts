import { UnipassWallet, CkitProvider } from '@ckit/ckit';
import { makeObservable, observable } from 'mobx';

export class ObservableUnipassWallet extends UnipassWallet {
  constructor(provider: CkitProvider) {
    super(provider);
    this.setDescriptor({ name: 'UniPass' });
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
    });
  }
}
