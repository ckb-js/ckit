import { Address, HexNumber } from '@ckb-lumos/base';
import { CkbTypeScript, EntrySigner } from '@ckitjs/base';
import { Transaction } from '@lay2/pw-core';
import { RecipientSameWithSenderError } from '../errors';
import { CkitProvider } from '../providers';
import { AbstractTransactionBuilder } from './AbstractTransactionBuilder';
import { TransferSudtPwBuilder } from './pw/TransferSudtPwBuilder';

interface TransferOptions {
  readonly recipient: Address;
  readonly sudt: CkbTypeScript;
  amount: HexNumber;
  policy: 'findAcp' | 'createCell' | 'findOrCreate';
}

export class AcpTransferSudtBuilder extends AbstractTransactionBuilder {
  private builder: TransferSudtPwBuilder;

  constructor(private options: TransferOptions[], private provider: CkitProvider, private signer: EntrySigner) {
    super();
    this.builder = new TransferSudtPwBuilder(options, provider, signer);
  }

  async build(): Promise<Transaction> {
    const signerAddress = await this.signer.getAddress();
    const transferToSelf = this.options.find((option) => option.recipient === signerAddress);
    if (transferToSelf) throw new RecipientSameWithSenderError({ address: signerAddress });

    return this.builder.build();
  }
}
