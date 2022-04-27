import { CkitProvider, RcAcpWallet } from '@ckitjs/ckit';
import { makeObservable, observable } from 'mobx';

export class ObservableAcpOmnilockWallet extends RcAcpWallet {
  constructor(provider: CkitProvider) {
    super(provider);
    this.setDescriptor({ name: 'MetaMask(Omnilock Acp)' });
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
    });
  }
}
