import { UnipassWallet } from 'ckit';
import { action, makeObservable, observable } from 'mobx';

export class ObservableUnipassWallet extends UnipassWallet {
  constructor(uri = 'https://unipass.me') {
    super(uri);
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
      onConnectStatusChanged: action,
      onSignerChanged: action,
      onSignerDisconnected: action,
    });
  }
}
