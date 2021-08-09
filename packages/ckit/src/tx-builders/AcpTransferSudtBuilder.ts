import { Address, HexNumber, Transaction } from '@ckb-lumos/base';
import { CkbTypeScript, Signer, TransactionBuilder } from '@ckit/base';
import { transformers } from '@lay2/pw-core';
import { CkitProvider } from '../providers';
import { PwAdapterSigner } from './pw/PwSignerAdapter';
import { TransferSudtPwBuilder } from './pw/TransferSudtPwBuilder';

interface TransferOptions {
  readonly recipient: Address;
  readonly sudt: CkbTypeScript;
  readonly amount: HexNumber;
}

export class AcpTransferSudtBuilder implements TransactionBuilder {
  private builder: TransferSudtPwBuilder;
  constructor(private options: TransferOptions, private provider: CkitProvider, private signer: Signer) {
    this.builder = new TransferSudtPwBuilder(options, provider, signer);
  }

  async build(): Promise<Transaction> {
    const tx = await this.builder.build();
    const signed = await new PwAdapterSigner(this.signer, this.provider).sign(tx);

    return transformers.TransformTransaction(signed) as Transaction;
  }
}
