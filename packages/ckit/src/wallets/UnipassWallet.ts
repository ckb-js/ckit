import { EventEmitter } from 'eventemitter3';
import { Wallet, Signer } from '../interfaces';
import { unimplemented } from '../utils';

export class UnipassSigner implements Signer {
  getAddress(): Promise<string> {
    unimplemented();
  }
  sign(_tx: unknown): Promise<unknown> {
    unimplemented();
  }
}

export class UnipassIframeWalletConnector extends EventEmitter implements Wallet {
  constructor(private uri = 'https://unipass.me') {
    super();
  }
  connect(): void {
    throw new Error('Method not implemented.');
  }
  disconnect(): void {
    unimplemented();
  }
}
