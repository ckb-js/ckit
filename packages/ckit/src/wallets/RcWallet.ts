// TODO impl me

import { HexString, Transaction } from '@ckb-lumos/base';
import { AbstractWallet, EntrySigner } from '@ckit/base';
import { CkitProvider } from '../providers';
import { unimplemented } from '../utils';

export interface RcSigner extends EntrySigner {
  getRcIdentity(): Promise<HexString>;
}

export class RcWallet extends AbstractWallet {
  protected tryConnect(): Promise<RcSigner> {
    unimplemented();
  }
}

export class RcPwSigner implements RcSigner {
  getAddress(): Promise<string> {
    unimplemented();
  }

  seal(_tx: unknown): Promise<Transaction> {
    unimplemented();
  }

  getRcIdentity(): Promise<HexString> {
    unimplemented();
  }
}

export class InternalRcPwSigner implements RcSigner {
  constructor(private privKey: HexString, private provider: CkitProvider) {}

  getAddress(): Promise<string> {
    unimplemented();
  }

  seal(_tx: unknown): Promise<Transaction> {
    unimplemented();
  }

  getRcIdentity(): Promise<HexString> {
    unimplemented();
  }
}
