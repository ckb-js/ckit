import { UnipassWallet } from 'ckit';
import { makeObservable, observable } from 'mobx';

export class ObservableUnipassWallet extends UnipassWallet {
  constructor(uri = 'https://unipass.me') {
    super(uri);
    this.setDescriptor({ name: 'UniPass' });
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
    });
  }
}
