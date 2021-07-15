import { Transaction } from '@ckb-lumos/base';

export interface TransactionBulder {
  build(): Promise<Transaction>;
}
