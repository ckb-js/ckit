import { HexString } from '@ckb-lumos/base';
import { AbstractWallet, EntrySigner, WalletFeature } from '@ckitjs/base';
import { RcIdentityFlag, RcIdentityLockArgs, SerializeRcLockWitnessLock } from '@ckitjs/rc-lock';
import { bytes } from '@ckitjs/utils';
import { Reader } from 'ckb-js-toolkit';
import { CkitProvider } from '../providers';
import { RcIdentity } from '../tx-builders';
import { AbstractSingleEntrySigner } from './AbstractSingleEntrySigner';
import { detect, EthereumProvider } from './PwWallet';

export interface RcSigner extends EntrySigner {
  getRcIdentity(): RcIdentity;
}

/**
 * The RC wallet now only supported Eth identity via MetaMask
 */
export class RcOwnerWallet extends AbstractWallet {
  constructor(private provider: CkitProvider) {
    super();
    this.setDescriptor({ name: 'RcWallet' });
  }

  protected describeFeatures(): WalletFeature[] {
    return ['issue-sudt'];
  }

  protected async tryConnect(): Promise<EntrySigner> {
    const ethProvider = await detect();

    // request to connect to MetaMask if never been connected
    if (!ethProvider.selectedAddress) {
      await ethProvider.request({ method: 'eth_requestAccounts' });
    }

    ethProvider.addListener('accountsChanged', (signer) => {
      if (signer && signer.length > 0) {
        super.emitChangedSigner(new RcPwSigner(this.provider, ethProvider));
        return;
      }

      super.emitConnectStatusChanged('disconnected');
    });

    return new RcPwSigner(this.provider, ethProvider);
  }
}

export class RcPwSigner extends AbstractSingleEntrySigner implements RcSigner {
  constructor(private provider: CkitProvider, private ethProvider: EthereumProvider) {
    super({ provider });
  }

  getAddress(): string {
    const rcOwnerLockArgs = bytes.toHex(
      RcIdentityLockArgs.encode({
        rc_identity_flag: RcIdentityFlag.ETH,
        rc_identity_pubkey_hash: this.ethProvider.selectedAddress,
        rc_lock_flag: 0,
      }),
    );

    return this.provider.parseToAddress(this.provider.newScript('RC_LOCK', rcOwnerLockArgs));
  }

  getRcIdentity(): RcIdentity {
    return {
      flag: RcIdentityFlag.ETH,
      pubkeyHash: this.ethProvider.selectedAddress,
    };
  }

  async personalSign(message: HexString): Promise<HexString> {
    const from = this.ethProvider.selectedAddress;
    return this.ethProvider.request({ method: 'personal_sign', params: [from, message] });
  }

  async signMessage(message: HexString): Promise<HexString> {
    const signedMessage = await this.personalSign(message);

    let v = Number.parseInt(signedMessage.slice(-2), 16);
    if (v >= 27) v -= 27;
    const signature = '0x' + signedMessage.slice(2, -2) + v.toString(16).padStart(2, '0');

    return Promise.resolve(
      new Reader(SerializeRcLockWitnessLock({ signature: new Reader(signature) })).serializeJson(),
    );
  }
}
