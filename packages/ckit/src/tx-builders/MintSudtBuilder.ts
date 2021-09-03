import { Address, HexNumber } from '@ckb-lumos/base';
import { EntrySigner } from '@ckit/base';
import { Transaction } from '@lay2/pw-core';
import { RecipientSameWithSenderError } from '../errors';
import { CkitProvider } from '../providers';
import { AbstractTransactionBuilder } from './AbstractTransactionBuilder';
import { NonAcpPwMintBuilder } from './pw/MintSudtPwBuilder';

type CapacityPolicy =
  // mint only when recipient has ACP cell
  | 'findAcp'
  // mint and create a cell for recipient
  // TODO rename to createCell
  | 'createCell';

export type RecipientOptions = {
  recipient: Address;
  amount: HexNumber;
  /**
   * additional transfer CKBytes.
   * If the policy is `createCell`, the capacity required by the cell itself will NOT be counted in the
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

export class MintSudtBuilder extends AbstractTransactionBuilder {
  constructor(private options: MintOptions, private provider: CkitProvider, private signer: EntrySigner) {
    super();
  }

  private async buildPwTransaction() {
    const signerAddress = await this.signer.getAddress();
    const builder = new NonAcpPwMintBuilder(this.options, this.provider, signerAddress);
    return await builder.build();
  }
  async build(): Promise<Transaction> {
    const signerAddress = await this.signer.getAddress();
    const mintToSelf = this.options.recipients.some(
      (item) => item.recipient === signerAddress && item.capacityPolicy === 'findAcp',
    );
    if (mintToSelf) throw new RecipientSameWithSenderError({ address: signerAddress });

    return this.buildPwTransaction();
  }
}
