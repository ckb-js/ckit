import { Transaction as RawRawTransaction } from '@ckb-lumos/base';
import { Signer, TransactionBuilder } from '@ckit/base';
import { transformers } from '@lay2/pw-core';
import { CkitProvider } from '../providers';
import { MintOptions } from './MintSudtBuilder';
import { NonAcpPwMintBuilder } from './pw/MintSudtPwBuilder';
import { PwAdapterSigner } from './pw/PwSignerAdapter';

export class MintSudtBuilder2 implements TransactionBuilder {
  constructor(private options: MintOptions, private provider: CkitProvider, private signer: Signer) {}

  async build(): Promise<RawRawTransaction> {
    const builder = new NonAcpPwMintBuilder(this.options, this.provider, await this.signer.getAddress());

    const tx = await builder.build();
    const signed = await new PwAdapterSigner(this.signer).sign(tx);

    // the recipients' cells are acp, signature is unnecessary
    signed.witnesses.splice(1, Infinity);
    signed.witnessArgs.splice(1, Infinity);

    return transformers.TransformTransaction(signed) as RawRawTransaction;
  }
}
