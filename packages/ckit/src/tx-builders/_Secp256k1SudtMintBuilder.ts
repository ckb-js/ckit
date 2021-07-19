import { HexNumber, Transaction } from '@ckb-lumos/base';
import { AddressLike, Provider, TransactionBuilder } from '../interfaces';
import { unimplemented } from '../utils';

interface MintOptions {
  readonly sudt: AddressLike;
  readonly to: AddressLike;
  readonly amount: HexNumber;
}

export class _Secp256k1SudtMintBuilder implements TransactionBuilder {
  constructor(private options: MintOptions, private provider: Provider) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}
