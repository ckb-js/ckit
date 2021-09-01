// TODO impl me

import { Transaction } from '@ckb-lumos/base';
import { AbstractWallet, EntrySigner } from '@ckit/base';
import { RcIdentity } from '../tx-builders';
import { unimplemented } from '../utils';

export interface RcSigner extends EntrySigner {
  getRcIdentity(): RcIdentity;
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

  getRcIdentity(): RcIdentity {
    unimplemented();
  }
}
