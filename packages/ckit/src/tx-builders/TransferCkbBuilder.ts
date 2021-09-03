// just for testing case, do not use it
import { Address, HexNumber } from '@ckb-lumos/base';
import { EntrySigner } from '@ckit/base';
import { Transaction } from '@lay2/pw-core';
import { RecipientSameWithSenderError } from '../errors';
import { CkitProvider } from '../providers';
import { AbstractTransactionBuilder } from './AbstractTransactionBuilder';
import { TransferCkbPwBuilder } from './pw/TransferCkbPwBuilder';

type CapacityPolicy =
  // mint only when recipient has ACP cell
  | 'findAcp'
  // mint and create an ACP cell for recipient
  | 'createCell';

export interface TransferCkbOptions {
  recipients: RecipientOption[];
}

interface RecipientOption {
  amount: HexNumber;
  recipient: Address;
  /**
   * defaults to findAcp
   */
  capacityPolicy: CapacityPolicy;
}

export class TransferCkbBuilder extends AbstractTransactionBuilder {
  constructor(private options: TransferCkbOptions, private provider: CkitProvider, private signer: EntrySigner) {
    super();
  }

  async build(): Promise<Transaction> {
    const signerAddress = await this.signer.getAddress();
    const transferToSelf = this.options.recipients.some(
      (item) => item.recipient === signerAddress && item.capacityPolicy === 'findAcp',
    );
    if (transferToSelf) throw new RecipientSameWithSenderError({ address: signerAddress });

    const builder = new TransferCkbPwBuilder(this.options, this.provider, this.signer);
    return builder.build();
  }
}
