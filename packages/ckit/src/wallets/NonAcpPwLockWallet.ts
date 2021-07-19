import { Hash, Transaction } from '@ckb-lumos/base';
import { EventEmitter } from 'eventemitter3';
import { Signer, Wallet } from '../interfaces';
import { unimplemented } from '../utils';

export class NonAcpPwLockWallet extends EventEmitter implements Wallet {
  connect(): void {
    unimplemented();
  }
}

export class Secp256k1LockSigner implements Signer {
  getAddress(): Promise<string> {
    unimplemented();
  }

  sign(_tx: Transaction): Promise<Transaction> {
    unimplemented();
  }

  sendTransaction(_tx: Transaction): Promise<Hash> {
    unimplemented();
  }
}
