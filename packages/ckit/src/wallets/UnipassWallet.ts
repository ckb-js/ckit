import { Hash, Transaction } from '@ckb-lumos/base';
import { Signer, AbstractWallet } from '../interfaces';
import { unimplemented } from '../utils';

export class UnipassSigner implements Signer {
  getAddress(): Promise<string> {
    unimplemented();
  }

  sign(_tx: Transaction): Promise<Transaction> {
    unimplemented();
  }

  sendTransaction(_tx: unknown): Promise<Hash> {
    unimplemented();
  }
}

export class UnipassIframeWalletConnector extends AbstractWallet {
  constructor(private uri = 'https://unipass.me') {
    super();
  }

  connect(): void {
    unimplemented();
  }
}
