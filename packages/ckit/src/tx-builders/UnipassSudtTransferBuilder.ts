import { Address, HexNumber, Transaction } from '@ckb-lumos/base';
import { CkbTypeScript, TransactionBuilder } from '../interfaces';
import { MercuryProvider } from '../providers/MercuryProvider';
import { unimplemented } from '../utils';

interface TransferOptions {
  readonly sudt: CkbTypeScript;
  readonly to: Address;
  readonly amount: HexNumber;
}

export class UnipassSudtTransferBuilder implements TransactionBuilder {
  constructor(private options: TransferOptions, private provider: MercuryProvider) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}
