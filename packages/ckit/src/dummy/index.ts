import { EventEmitter } from 'eventemitter3';
import { ConnectStatus, Signer, Wallet } from '../interfaces';

export class DummyWallet extends EventEmitter implements Wallet {
  private connectStatus: ConnectStatus = 'disconnected';
  private signer: Signer | undefined = undefined;

  private setConnectStatus(status: ConnectStatus): void {
    this.connectStatus = status;
    this.emit('connectStatusChanged', status);
  }

  private setSigner(signer: Signer): void {
    this.emit('signerChanged', signer);
  }

  connect(): void {
    if (this.connectStatus !== 'disconnected') return;
    this.setConnectStatus('connecting');
    setTimeout(() => {
      if (this.connectStatus !== 'connecting') return;
      this.setConnectStatus('connected');
      this.setSigner(new DummySigner());
    }, 500);
  }

  disconnect(): void {
    this.setConnectStatus('disconnected');
  }
}

class DummySigner implements Signer {
  async getAddress(): Promise<string> {
    return 'ckt1dummyaddress';
  }

  async sign(): Promise<unknown> {
    return 'signed transaction';
  }
}
