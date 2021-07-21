import { Address, HexNumber, Transaction } from '@ckb-lumos/base';
import { Provider, TransactionBuilder } from '../interfaces';
import { unimplemented } from '../utils';

interface MintOptions {
  readonly sudt: Address;
  readonly to: Address;
  readonly amount: HexNumber;
}

export class _Secp256k1SudtMintBuilder implements TransactionBuilder {
  constructor(private options: MintOptions, private provider: Provider) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}
