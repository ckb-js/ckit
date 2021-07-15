import { OutPoint, Script, Transaction } from '@ckb-lumos/base';
import { BigNumber } from 'bignumber.js';
import { TransactionBuilder } from '../interfaces';
import { MercuryClient } from '../sdks/MercuryClient';
import { unimplemented } from '../utils';

interface TransferOptions {
  readonly sudt: Script;
  readonly to: Script;
  readonly amount: BigNumber;
}

interface SudtTransferProvider {
  collectLiveCell(): Promise<OutPoint>;
  collectSudt(): Promise<OutPoint>;
}

export class UnipassSudtTransferBuilder implements TransactionBuilder {
  constructor(private options: TransferOptions, private provider: SudtTransferProvider) {}

  async build(): Promise<Transaction> {
    unimplemented();
  }
}

export class SudtTransferMercuryProvider implements SudtTransferProvider {
  constructor(private lock: Script, private client: MercuryClient) {}
  collectLiveCell(): Promise<OutPoint> {
    unimplemented();
  }
  collectSudt(): Promise<OutPoint> {
    unimplemented();
  }
}
