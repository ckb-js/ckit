import { Transaction } from '@ckb-lumos/base';
import { AbstractWallet, EntrySigner } from '../';

export class DummyWallet extends AbstractWallet {
  constructor() {
    super();
    this.setDescriptor({ name: 'DummyWallet', features: ['dummy'] });
  }

  protected tryConnect(): Promise<EntrySigner> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(new DummySigner()), 500);
    });
  }
}

class DummySigner implements EntrySigner {
  async getAddress(): Promise<string> {
    return 'ckt1qj2fmdr6437352sdjgf5fhzurh00mgussyap3qw4dgy894ucurtzj0zrsk22amhe0evutcsup8ydmshf47t9xhsnl9c';
  }

  async seal(_x: unknown): Promise<Transaction> {
    throw new Error('unimplemented');
  }
}

export class ExtendedDummyWallet extends DummyWallet {
  constructor() {
    super();
    this.setDescriptor({ name: 'ExtendedDummyWallet', features: this.descriptor.features.concat(['unknown-feature']) });
  }
}
