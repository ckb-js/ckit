import { Hash } from '@ckb-lumos/base';
import { RcIdentity } from '@ckit/rc-lock';
import { Transaction } from '@lay2/pw-core';
import { CkitProvider } from '../../providers';
import { AbstractTransactionBuilder } from '../AbstractTransactionBuilder';
import { RecipientOptions } from '../MintSudtBuilder';
import { MintRcUdtPwBuilder } from './MintRcUdtPwBuilder';

export interface MintRcUdtOptions {
  /**
   * rc-supply cell hello
   * {@link CreateRcUdtInfoCellBuilder.getTypeHash}
   */
  udtId: Hash;
  /**
   * issuer rc identity
   */
  rcIdentity: RcIdentity;
  recipients: RecipientOptions[];
}

/**
 * Mint sUDT with RC-Supply-Lock, the capacity provider which is a rc-lock with {@link https://github.com/XuJiandong/docs-bank/blob/master/rc_lock.md#identity RcIdentity},
 */
export class MintRcUdtBuilder extends AbstractTransactionBuilder {
  constructor(private options: MintRcUdtOptions, private provider: CkitProvider) {
    super();
  }

  build(): Promise<Transaction> {
    return new MintRcUdtPwBuilder(this.options, this.provider).build();
  }
}
