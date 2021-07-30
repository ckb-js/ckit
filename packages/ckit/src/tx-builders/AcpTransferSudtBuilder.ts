import { Address, HexNumber, Transaction } from '@ckb-lumos/base';
import { CkbTypeScript, Signer, TransactionBuilder } from '@ckit/base';
import { MercuryProvider } from '../providers';
import { unimplemented } from '../utils';

interface TransferOptions {
  readonly recipient: Address;
  readonly sudt: CkbTypeScript;
  readonly amount: HexNumber;
}

export class AcpTransferSudtBuilder implements TransactionBuilder {
  constructor(private options: TransferOptions, private provider: MercuryProvider, private signer: Signer) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}
