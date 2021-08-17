/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { HexString, Transaction } from '@ckb-lumos/base';
import { AbstractProvider, EntrySigner } from '@ckit/base';
import {
  Blake2bHasher,
  Hasher,
  Message,
  Transaction as PwTransaction,
  transformers,
  Signer as PwSigner,
} from '@lay2/pw-core';
import { Pw } from '../helpers/pw';

class PwAdapterSigner extends PwSigner {
  constructor(
    private rawSigner: AbstractSingleEntrySigner,
    private provider: AbstractProvider,
    hasher = new Blake2bHasher(),
  ) {
    super(hasher);
  }

  protected async signMessages(messages: Message[]): Promise<string[]> {
    const sigs = [];
    const signerLock = Pw.toPwScript(this.provider.parseToScript(await this.rawSigner.getAddress()));

    for (const item of messages) {
      if (item.lock.sameWith(signerLock)) {
        const sig = await this.rawSigner.signMessage(item.message);
        sigs.push(sig);
      } else {
        sigs.push('0x');
      }
    }

    return sigs;
  }
}

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

  abstract getAddress(): Promise<string>;
  abstract signMessage(message: HexString): Promise<HexString>;

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
