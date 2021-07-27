import { Address, HexNumber, Transaction } from '@ckb-lumos/base';
import { Signer, TransactionBuilder } from '@ckit/base';
import { MercuryProvider } from '../providers/MercuryProvider';
import { unimplemented } from '../utils';

type CapacityPolicy =
  // mint only when recipient has ACP cell
  | 'findAcp'
  // mint and create an ACP cell for recipient
  | 'createAcp'
  // find the recipient's ACP cell, and if not find it, create a new ACP for the recipient
  | 'findOrCreateAcp';

type RecipientOptions = {
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
  constructor(private options: MintOptions, private provider: MercuryProvider, private signer: Signer) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}
