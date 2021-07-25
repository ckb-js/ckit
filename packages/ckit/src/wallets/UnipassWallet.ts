import { HexString } from '@ckb-lumos/base';
import { Signer, AbstractWallet } from '../interfaces';
import { unimplemented } from '../utils';
import { default as UnipassProvider } from './unipass/UnipassProvider';

export class UnipassSigner implements Signer {
  constructor(private address: string) {}

  getAddress(): Promise<string> {
    return Promise.resolve(this.address);
  }

  signMessage(_tx: HexString): Promise<HexString> {
    unimplemented();
  }
}

export class UnipassWallet extends AbstractWallet {
  unipassConnector: UnipassProvider;

  constructor(private uri = 'https://unipass.me') {
    super({ features: ['issue-sudt'] });
    this.unipassConnector = new UnipassProvider();
  }

  connect(): void {
    this.onConnectStatusChanged('connecting');
    void this.unipassConnector.init().then(() => {
      this.onConnectStatusChanged('connected');
      this.onSignerChanged(new UnipassSigner(this.unipassConnector.address.toCKBAddress()));
    });
  }
}
