import { Address, HexNumber } from '@ckb-lumos/base';
import { CkbTypeScript } from '@ckitjs/base';
import { Transaction } from '@lay2/pw-core';
import { RecipientSameWithSenderError } from '../errors';
import { CkitProvider } from '../providers';
import { AbstractTransactionBuilder } from './AbstractTransactionBuilder';
import { TransferSudtPwBuilder } from './pw/TransferSudtPwBuilder';

interface TransferOptions {
  readonly recipient: Address;
  readonly sudt: CkbTypeScript;
  readonly amount: HexNumber;
}

export class AcpTransferSudtBuilder extends AbstractTransactionBuilder {
  private builder: TransferSudtPwBuilder;

  constructor(private options: TransferOptions, private provider: CkitProvider, private sender: Address) {
    super();
    this.builder = new TransferSudtPwBuilder(options, provider, sender);
  }

  async build(): Promise<Transaction> {
    const transferToSelf = this.options.recipient === this.sender;
    if (transferToSelf) throw new RecipientSameWithSenderError({ address: this.sender });

    return this.builder.build();
  }
}
