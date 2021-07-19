import { HexNumber, Transaction } from '@ckb-lumos/base';
import { AddressLike, TransactionBuilder } from '../interfaces';
import { MercuryProvider } from '../providers/MercuryProvider';
import { unimplemented } from '../utils';

export interface MintOptions {
  issuer: AddressLike;
  recipient: AddressLike;
  sudt: AddressLike;
  amount: HexNumber;
}

export class PwSudtMintBuilder implements TransactionBuilder {
  constructor(private options: MintOptions, private provider: MercuryProvider) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}
