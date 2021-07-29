import { makeObservable, observable } from 'mobx';
import { UnipassWallet } from './UnipassWallet';

export class ObservableUnipassWallet extends UnipassWallet {
  constructor(uri = 'https://unipass.me') {
    super(uri);
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
    });
  }
}
