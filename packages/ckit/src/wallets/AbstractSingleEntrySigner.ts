/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { HexString, Transaction } from '@ckb-lumos/base';
import { AbstractProvider, EntrySigner } from '@ckitjs/base';
import { Blake2bHasher, Hasher, Transaction as PwTransaction, transformers } from '@lay2/pw-core';
import { PwAdapterSigner } from './pw/PwAdapterSigner';

interface Options {
  provider: AbstractProvider;
  hasher?: Hasher;
}

export abstract class AbstractSingleEntrySigner implements EntrySigner {
  private adapter: PwAdapterSigner;
  constructor(options: Options) {
    const hasher = options.hasher ?? new Blake2bHasher();
    this.adapter = new PwAdapterSigner(this, options.provider, hasher);
  }

  abstract getAddress(): Promise<string> | string;
  abstract signMessage(message: HexString): Promise<HexString> | HexString;

  async partialSeal(tx: PwTransaction): Promise<PwTransaction> {
    return await this.adapter.sign(tx as PwTransaction);
  }

  // TODO refactor to sig entry to adapt mercury
  /**
   *
   * @param tx the tx is actually PwTransaction, but may change in the future in order to migrate to mercury
   */
  async seal(tx: unknown /* PwTransaction */): Promise<Transaction> {
    const signed = await this.adapter.sign(tx as PwTransaction);
    return transformers.TransformTransaction(signed) as Transaction;
  }
}
