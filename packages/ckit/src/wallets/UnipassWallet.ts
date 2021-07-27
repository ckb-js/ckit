import { HexString } from '@ckb-lumos/base';
import { Signer, AbstractWallet } from '@ckit/base';
import { unimplemented } from '../utils';

export class UnipassSigner implements Signer {
  constructor(private address: string) {}

  getAddress(): Promise<string> {
    return Promise.resolve(this.address);
  }

  signMessage(_tx: HexString): Promise<HexString> {
    unimplemented();
  }
}

export class UnipassIframeWalletConnector extends AbstractWallet {
  constructor(private uri = 'https://unipass.me') {
    super();
  }

  connect(): void {
    unimplemented();
  }
}
