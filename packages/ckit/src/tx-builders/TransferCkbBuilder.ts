import { Address, HexNumber, Transaction } from '@ckb-lumos/base';
import { Signer, TransactionBuilder } from '@ckit/base';
import { CkitProvider } from '../providers';
import { unimplemented } from '../utils';

type CapacityPolicy =
  // mint only when recipient has ACP cell
  | 'findAcp'
  // mint and create an ACP cell for recipient
  | 'createAcp'
  // find the recipient's ACP cell, and if not find it, create a new ACP for the recipient
  | 'findOrCreateAcp';

export interface TransferCkbOptions {
  recipients: RecipientOption[];
}

interface RecipientOption {
  amount: HexNumber;
  recipient: Address;
  /**
   * defaults to findAcp
   */
  capacityPolicy?: CapacityPolicy;
}

export class TransferCkbBuilder implements TransactionBuilder {
  constructor(private options: TransferCkbOptions, private provider: CkitProvider, private signer: Signer) {}

  build(): Promise<Transaction> {
    unimplemented();
  }
}
