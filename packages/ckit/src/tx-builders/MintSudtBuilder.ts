import { Address, HexNumber, Transaction as RawRawTransaction } from '@ckb-lumos/base';
import { Signer, TransactionBuilder } from '@ckit/base';
import { transformers } from '@lay2/pw-core';
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
    const builder = new NonAcpPwMintBuilder(this.options, this.provider, await this.signer.getAddress());

    const tx = await builder.build();
    const signed = await new PwAdapterSigner(this.signer).sign(tx);

    // the recipients' cells are acp, signature is unnecessary
    signed.witnesses.splice(1, Infinity);
    signed.witnessArgs.splice(1, Infinity);

    return transformers.TransformTransaction(signed) as RawRawTransaction;
  }
}
