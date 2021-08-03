import { HexString } from '@ckb-lumos/base';
import { AbstractWallet, Signer } from '@ckit/base';
import { makeObservable, observable } from 'mobx';

export class DummyWallet extends AbstractWallet {
  constructor() {
    super();
    makeObservable(this, {
      connectStatus: observable,
      signer: observable,
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
