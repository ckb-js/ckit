import { Address, HexNumber, Transaction } from '@ckb-lumos/base';
import { CkbTypeScript, TransactionBuilder } from '../interfaces';
import { MercuryProvider } from '../providers/MercuryProvider';
import { unimplemented } from '../utils';

export interface MintOptions {
  issuer: Address;
  recipient: Address;
  sudt: CkbTypeScript;
  amount: HexNumber;
}

export class PwSudtMintBuilder implements TransactionBuilder {
  constructor(private options: MintOptions, private provider: MercuryProvider) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}
