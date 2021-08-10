import { HexString } from '@ckb-lumos/base';
import { Signer, AbstractWallet } from '@ckit/base';
import { default as Unipass } from './unipass/UnipassProvider';

export class UnipassSigner implements Signer {
  constructor(private unipass: Unipass) {}

  getAddress(): Promise<string> {
    return Promise.resolve(this.unipass.address.toCKBAddress());
  }

  signMessage(message: HexString): Promise<HexString> {
    return this.unipass.sign(message);
  }
}

export class UnipassWallet extends AbstractWallet {
  unipassConnector: Unipass;

  constructor(private uri = 'https://unipass.me') {
    super();
    this.setDescriptor({
      name: 'UnipassWallet',
      description: 'Interacting with CKB via an Email',
      features: ['acp'],
    });
    this.unipassConnector = new Unipass();
  }

  connect(): void {
    this.onConnectStatusChanged('connecting');
    void this.unipassConnector.init().then(() => {
      this.onConnectStatusChanged('connected');
      this.onSignerChanged(new UnipassSigner(this.unipassConnector));
    });
  }
}
