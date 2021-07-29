import { makeObservable, observable } from 'mobx';
import { CkitProvider } from '../providers/CkitProvider';
import { NonAcpPwLockWallet } from './NonAcpPwLockWallet';

export class ObservableNonAcpPwLockWallet extends NonAcpPwLockWallet {
  constructor(ckitProvider: CkitProvider) {
    super(ckitProvider);
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
    });
  }
}
