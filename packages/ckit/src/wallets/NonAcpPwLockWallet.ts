import { Hash, Transaction } from '@ckb-lumos/base';
import { AbstractWallet, Signer } from '../interfaces';
import { unimplemented } from '../utils';

export class NonAcpPwLockWallet extends AbstractWallet {
  constructor() {
    super();
  }

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
