import { HexString } from '@ckb-lumos/base';
import { AbstractWallet, Signer } from '../';

export class DummyWallet extends AbstractWallet {
  constructor() {
    super();
    this.setDescriptor({ name: 'DummyWallet', features: ['dummy'] });
  }

  protected tryConnect(): Promise<Signer> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(new DummySigner()), 500);
    });
  }
}

class DummySigner implements Signer {
  async getAddress(): Promise<string> {
    return 'ckt1qj2fmdr6437352sdjgf5fhzurh00mgussyap3qw4dgy894ucurtzj0zrsk22amhe0evutcsup8ydmshf47t9xhsnl9c';
  }

  async signMessage(): Promise<HexString> {
    return '0x';
  }
}

export class ExtendedDummyWallet extends DummyWallet {
  constructor() {
    super();
    this.setDescriptor({ name: 'ExtendedDummyWallet', features: this.descriptor.features.concat(['unknown-feature']) });
  }
}
