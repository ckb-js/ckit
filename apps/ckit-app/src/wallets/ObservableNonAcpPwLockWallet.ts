import { CkitProvider, NonAcpPwLockWallet } from 'ckit';
import { action, makeObservable, observable } from 'mobx';

export class ObservableNonAcpPwLockWallet extends NonAcpPwLockWallet {
  constructor(ckitProvider: CkitProvider) {
    super(ckitProvider);
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
      onConnectStatusChanged: action,
      onSignerChanged: action,
      onSignerDisconnected: action,
    });
  }
}
