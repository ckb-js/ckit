import { Signer } from '@ckit/base';
import { Blake2bHasher, Message, Signer as PwSigner } from '@lay2/pw-core';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';

export class PwAdapterSigner extends PwSigner {
  constructor(private rawSigner: Signer, private provider: CkitProvider, hasher = new Blake2bHasher()) {
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
