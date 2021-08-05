import { Signer } from '@ckit/base';
import { Blake2bHasher, Message, Signer as PwSigner } from '@lay2/pw-core';

export class PwAdapterSigner extends PwSigner {
  constructor(private rawSigner: Signer, hasher = new Blake2bHasher()) {
    super(hasher);
  }

  protected signMessages(messages: Message[]): Promise<string[]> {
    return Promise.all(messages.map((msg) => this.rawSigner.signMessage(msg.message)));
  }
}
