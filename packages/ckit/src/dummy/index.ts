import { HexString } from '@ckb-lumos/base';
import { AbstractWallet, Signer } from '@ckit/base';
import { makeObservable, computed, action, observable } from 'mobx';

export class DummyWallet extends AbstractWallet {
  constructor() {
    super({ features: ['issue-sudt'] });
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
      getConnectStatus: computed,
      getSigner: computed,
      onConnectStatusChanged: action,
      onSignerChanged: action,
      connect: action,
    });
  }

  connect(): void {
    if (this.connectStatus !== 'disconnected') return;
    this.onConnectStatusChanged('connecting');
    setTimeout(() => {
      if (this.connectStatus !== 'connecting') return;
      this.onConnectStatusChanged('connected');
      this.onSignerChanged(new DummySigner());
    }, 500);
  }
}

class DummySigner implements Signer {
  async getAddress(): Promise<string> {
    return 'ckt1qj2fmdr6437352sdjgf5fhzurh00mgussyap3qw4dgy894ucurtzj0zrsk22amhe0evutcsup8ydmshf47t9xhsnl9c';
  }

  async signMessage(): Promise<HexString> {
    return '0x';
  }
}
