import { OutPoint, Transaction } from '@ckb-lumos/base';
import { BigNumber } from 'bignumber.js';
import { AddressLike, Provider, TransactionBuilder } from '../interfaces';
import { unimplemented } from '../utils';

interface TransferOptions {
  readonly sudt: AddressLike;
  readonly to: AddressLike;
  readonly amount: BigNumber;
}

interface SudtTransferProvider extends Provider {
  collectSudt(): Promise<OutPoint>;
}

export class UnipassSudtTransferBuilder implements TransactionBuilder {
  constructor(private options: TransferOptions, private provider: SudtTransferProvider) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}
