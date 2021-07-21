import { Transaction } from '@ckb-lumos/base';
import { AbstractWallet, Signer } from '../interfaces';

export class DummyWallet extends AbstractWallet {
  constructor() {
    super();
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
    return 'ckt1dummyaddress';
  }

  async sign(): Promise<Transaction> {
    return {
      cell_deps: [],
      header_deps: [],
      inputs: [],
      outputs: [],
      outputs_data: [],
      version: '0x0',
      witnesses: [],
    };
  }
}
