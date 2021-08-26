import { Hash } from '@ckb-lumos/base';
import { Transaction } from '@lay2/pw-core';
import { CkitProvider } from '../../providers';
import { unimplemented } from '../../utils';
import { AbstractTransactionBuilder } from '../AbstractTransactionBuilder';
import { RecipientOptions } from '../MintSudtBuilder';

export interface MintRcUdtOptions {
  /**
   * {@link CreateRcUdtInfoCellBuilder.getTypeHash}
   */
  udtId: Hash;
  recipients: RecipientOptions[];
}

export class MintRcUdtBuilder extends AbstractTransactionBuilder {
  constructor(private options: MintRcUdtOptions, private provider: CkitProvider) {
    super();
  }

  build(): Promise<Transaction> {
    unimplemented();
  }
}
