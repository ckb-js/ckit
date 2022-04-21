import { CkitProvider, RcOwnerWallet } from '@ckitjs/ckit';
import { makeObservable, observable } from 'mobx';

export class ObservableOmnilockWallet extends RcOwnerWallet {
  constructor(provider: CkitProvider) {
    super(provider);
    this.setDescriptor({ name: 'MetaMask(Omnilock)' });
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
    });
  }
}
