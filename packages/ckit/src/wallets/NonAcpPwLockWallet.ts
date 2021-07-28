import { HexString } from '@ckb-lumos/base';
import { AbstractWallet, Signer } from '@ckit/base';
import { EthProvider, Provider as PwProvider } from '@lay2/pw-core';
import { CkitProvider } from '../providers/CkitProvider';

export class NonAcpPwLockWallet extends AbstractWallet {
  private readonly pwProvider: PwProvider;
  private readonly ckitProvider: CkitProvider;

  constructor(ckitProvider: CkitProvider) {
    super();
    this.ckitProvider = ckitProvider;

    // FIXME the PwEthProvider has a bug when all accounts are disconnected
    this.pwProvider = new EthProvider((newAddress) => {
      if (newAddress == null) {
        this.onConnectStatusChanged('disconnected');
        return;
      }

      this.onSignerChanged(new NonAcpPwLockSigner(this.ckitProvider, this.pwProvider));
    });
  }

  connect(): void {
    // prevent connect multi times
    if (this.connectStatus !== 'disconnected') return;

    this.onConnectStatusChanged('connecting');
    void this.pwProvider.init().then(
      () => {
        this.onConnectStatusChanged('connected');
        this.onSignerChanged(new NonAcpPwLockSigner(this.ckitProvider, this.pwProvider));
      },
      (e) => {
        this.onConnectStatusChanged('disconnected');
        this.onError(e);
      },
    );
  }
}

export class NonAcpPwLockSigner implements Signer {
  constructor(private ckitProvider: CkitProvider, private pwProvider: PwProvider) {}

  async getAddress(): Promise<string> {
    const config = this.ckitProvider.getScriptConfig('PW_NON_ANYONE_CAN_PAY');

    return this.ckitProvider.parseToAddress({
      hash_type: config.HASH_TYPE,
      args: this.pwProvider.address.addressString,
      code_hash: config.CODE_HASH,
    });
  }

  signMessage(message: HexString): Promise<HexString> {
    return this.pwProvider.sign(message);
  }
}
