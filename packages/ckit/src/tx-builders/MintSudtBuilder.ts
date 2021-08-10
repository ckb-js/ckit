import { Address, HexNumber, Transaction as RawRawTransaction } from '@ckb-lumos/base';
import { Signer, TransactionBuilder } from '@ckit/base';
import { transformers } from '@lay2/pw-core';
import { RecipientSameWithSenderError } from '../errors';
import { CkitProvider } from '../providers';
import { NonAcpPwMintBuilder } from './pw/MintSudtPwBuilder';
import { PwAdapterSigner } from './pw/PwSignerAdapter';

type CapacityPolicy =
  // mint only when recipient has ACP cell
  | 'findAcp'
  // mint and create an ACP cell for recipient
  | 'createAcp';

export type RecipientOptions = {
  recipient: Address;
  amount: HexNumber;
  /**
   * additional transfer CKBytes
   */
  additionalCapacity?: HexNumber;
  /**
   * defaults to findAcp
   */
  capacityPolicy?: CapacityPolicy;
};

export interface MintOptions {
  recipients: RecipientOptions[];
}

export class MintSudtBuilder implements TransactionBuilder {
  constructor(private options: MintOptions, private provider: CkitProvider, private signer: Signer) {}

  async build(): Promise<RawRawTransaction> {
    const signerAddress = await this.signer.getAddress();
    const builder = new NonAcpPwMintBuilder(this.options, this.provider, signerAddress);

    const mintToSelf = this.options.recipients.some(
      (item) => item.recipient === signerAddress && item.capacityPolicy === 'findAcp',
    );
    if (mintToSelf) throw new RecipientSameWithSenderError({ address: signerAddress });

    const tx = await builder.build();
    const signed = await new PwAdapterSigner(this.signer, this.provider).sign(tx);

    return transformers.TransformTransaction(signed) as RawRawTransaction;
  }
}
