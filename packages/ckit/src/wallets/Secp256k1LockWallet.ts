import { EventEmitter } from 'eventemitter3';
import { Signer, Wallet } from '../interfaces';
import { unimplemented } from '../utils';

export class Secp256k1LockWallet extends EventEmitter implements Wallet {
  connect(): void {
    unimplemented();
  }
}

export class Secp256k1LockSigner implements Signer {
  getAddress(): Promise<string> {
    unimplemented();
  }
  sign(_tx: unknown): Promise<unknown> {
    unimplemented();
  }
}
