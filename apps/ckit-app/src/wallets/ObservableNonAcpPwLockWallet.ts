import { CkitProvider, NonAcpPwLockWallet } from '@ckit/ckit';
import { makeObservable, observable } from 'mobx';

export class ObservableNonAcpPwLockWallet extends NonAcpPwLockWallet {
  constructor(ckitProvider: CkitProvider) {
    super(ckitProvider);
    this.setDescriptor({ name: 'MetaMask' });
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
    });
  }
}
