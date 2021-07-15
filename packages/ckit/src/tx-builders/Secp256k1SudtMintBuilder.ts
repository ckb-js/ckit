import { OutPoint, Script, Transaction } from '@ckb-lumos/base';
import { BigNumber } from 'bignumber.js';
import { TransactionBuilder } from '../interfaces';
import { MercuryClient } from '../sdks/MercuryClient';
import { unimplemented } from '../utils';

interface MintOptions {
  readonly sudt: Script;
  readonly to: Script;
  readonly amount: BigNumber;
}

interface MintProvider {
  collectLiveCells(): Promise<OutPoint[]>;
}

export class Secp256k1SudtMintBuilder implements TransactionBuilder {
  constructor(private options: MintOptions, private provider: MintProvider) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}

export class SudtMintMercuryProvider implements MintProvider {
  constructor(private lock: Script, private mercury: MercuryClient) {}

  collectLiveCells(): Promise<OutPoint[]> {
    unimplemented();
  }
}
