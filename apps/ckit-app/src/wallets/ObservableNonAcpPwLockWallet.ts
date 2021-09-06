import { CkitProvider, NonAcpPwLockWallet } from '@ckitjs/ckit';
import { makeObservable, observable } from 'mobx';

export class ObservableNonAcpPwLockWallet extends NonAcpPwLockWallet {
  constructor(ckitProvider: CkitProvider) {
    super(ckitProvider);
    this.setDescriptor({ name: 'MetaMask(Non-ACP)' });
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
    });
  }
}
