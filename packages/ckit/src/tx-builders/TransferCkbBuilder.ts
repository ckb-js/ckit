// just for testing case, do not use it
import { Address, HexNumber, Transaction as RawRawTransaction, Transaction } from '@ckb-lumos/base';
import { Signer, TransactionBuilder } from '@ckit/base';
import { transformers } from '@lay2/pw-core';
import { RecipientSameWithSenderError } from '../errors';
import { CkitProvider } from '../providers';
import { PwAdapterSigner } from './pw/PwSignerAdapter';
import { TransferCkbPwBuilder } from './pw/TransferCkbPwBuilder';

type CapacityPolicy =
  // mint only when recipient has ACP cell
  | 'findAcp'
  // mint and create an ACP cell for recipient
  | 'createAcp';

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

export class TransferCkbBuilder implements TransactionBuilder {
  constructor(private options: TransferCkbOptions, private provider: CkitProvider, private signer: Signer) {}

  async build(): Promise<Transaction> {
    const signerAddress = await this.signer.getAddress();
    const transferToSelf = this.options.recipients.some(
      (item) => item.recipient === signerAddress && item.capacityPolicy === 'findAcp',
    );
    if (transferToSelf) throw new RecipientSameWithSenderError({ address: signerAddress });

    const builder = new TransferCkbPwBuilder(this.options, this.provider, this.signer);
    const tx = await builder.build();
    const signed = await new PwAdapterSigner(this.signer, this.provider).sign(tx);

    return transformers.TransformTransaction(signed) as RawRawTransaction;
  }
}
