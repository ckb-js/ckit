import { CkitProvider, AcpPwLockWallet } from '@ckitjs/ckit';
import { makeObservable, observable } from 'mobx';

export class ObservableAcpPwLockWallet extends AcpPwLockWallet {
  constructor(ckitProvider: CkitProvider) {
    super(ckitProvider);
    this.setDescriptor({ name: 'MetaMask(ACP)' });
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
    });
  }
}
