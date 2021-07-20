import { Transaction } from '@ckb-lumos/base';
import { BigNumber } from 'bignumber.js';
import { AddressLike, TransactionBuilder } from '../interfaces';
import { MercuryProvider } from '../providers/MercuryProvider';
import { unimplemented } from '../utils';

interface TransferOptions {
  readonly sudt: AddressLike;
  readonly to: AddressLike;
  readonly amount: BigNumber;
}

export class UnipassSudtTransferBuilder implements TransactionBuilder {
  constructor(private options: TransferOptions, private provider: MercuryProvider) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}
