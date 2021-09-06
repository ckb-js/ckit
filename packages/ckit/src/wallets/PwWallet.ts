import { HexString } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { AbstractWallet, EntrySigner, WalletFeature } from '@ckitjs/base';
import { Keccak256Hasher, Platform } from '@lay2/pw-core';
import detectEthereumProvider from '@metamask/detect-provider';
import { publicKeyCreate } from 'secp256k1';
import { CkitProvider } from '../providers';
import { hexToBytes } from '../utils';
import { AbstractSingleEntrySigner } from './AbstractSingleEntrySigner';

export interface EthereumProvider {
  selectedAddress: string;
  isMetaMask?: boolean;
  enable: () => Promise<string[]>;
  addListener: (event: 'accountsChanged', listener: (addresses: string[]) => void) => void;
  removeEventListener: (event: 'accountsChanged', listener: (addresses: string[]) => void) => void;
  request: (payload: { method: 'personal_sign'; params: [string /*from*/, string /*message*/] }) => Promise<string>;
}

export function detect(): Promise<EthereumProvider> {
  return detectEthereumProvider().then(() => window.ethereum as EthereumProvider);
}

abstract class AbstractPwWallet extends AbstractWallet {
  private readonly listener = (addresses: string[]) => {
    if (!Array.isArray(addresses)) return;
    if (addresses.length === 0) {
      this.emitConnectStatusChanged('disconnected');
      return;
    }

    this.emitChangedSigner(this.produceSigner());
  };

  protected constructor(protected ckitProvider: CkitProvider) {
    super();
    this.setDescriptor({
      features: this.describeFeatures(),
      description: 'Interacting with CKB via MetaMask',
      name: 'NonAcpPwLockWallet',
    });
  }

  disconnect() {
    void detect()
      .then((ethProvider) => ethProvider.removeEventListener('accountsChanged', this.listener))
      .then(() => super.disconnect());
  }

  protected async tryConnect(): Promise<EntrySigner> {
    const ethProvider = await detect();
    ethProvider.addListener('accountsChanged', this.listener);
    return ethProvider.enable().then(() => this.produceSigner());
  }

  protected abstract produceSigner(): EntrySigner;
  protected abstract describeFeatures(): WalletFeature[];
}

abstract class AbstractPwSigner extends AbstractSingleEntrySigner {
  constructor(protected ckitProvider: CkitProvider) {
    super({ provider: ckitProvider });
  }

  async signMessage(message: HexString): Promise<HexString> {
    const ethereumProvider = await detect();
    const from = ethereumProvider.selectedAddress;
    const result = await ethereumProvider.request({ method: 'personal_sign', params: [from, message] });

    let v = Number.parseInt(result.slice(-2), 16);
    if (v >= 27) v -= 27;
    return '0x' + Platform.eth.toString(16).padStart(2, '0') + result.slice(2, -2) + v.toString(16).padStart(2, '0');
  }

  abstract getAddress(): Promise<string>;
}

export class AcpPwLockWallet extends AbstractPwWallet {
  produceSigner(): EntrySigner {
    return new (class extends AbstractPwSigner {
      async getAddress(): Promise<string> {
        const config = this.ckitProvider.getScriptConfig('PW_ANYONE_CAN_PAY');

        return this.ckitProvider.parseToAddress({
          hash_type: config.HASH_TYPE,
          args: (await detect()).selectedAddress,
          code_hash: config.CODE_HASH,
        });
      }
    })(this.ckitProvider);
  }

  protected describeFeatures(): WalletFeature[] {
    return ['acp'];
  }
}

export class NonAcpPwLockWallet extends AbstractPwWallet {
  produceSigner(): EntrySigner {
    return new (class extends AbstractPwSigner {
      async getAddress(): Promise<string> {
        const config = this.ckitProvider.getScriptConfig('PW_NON_ANYONE_CAN_PAY');
        return this.ckitProvider.parseToAddress({
          hash_type: config.HASH_TYPE,
          args: (await detect()).selectedAddress,
          code_hash: config.CODE_HASH,
        });
      }
    })(this.ckitProvider);
  }

  protected describeFeatures(): WalletFeature[] {
    return ['issue-sudt'];
  }
}

export function hashMessage(message: HexString): string {
  // https://github.com/XuJiandong/pw-lock/blob/develop/c/pw_chain_ethereum.h#L43
  return new Keccak256Hasher()
    .update('\x19Ethereum Signed Message:\n32')
    .update(hexToBytes(message).buffer)
    .digest()
    .serializeJson();
}

export class InternalNonAcpPwLockSigner extends AbstractSingleEntrySigner {
  readonly #privateKey: HexString;
  constructor(privateKey: HexString, private ckitProvider: CkitProvider) {
    super({ provider: ckitProvider });
    this.#privateKey = privateKey;
  }

  getEthAddress(): string {
    const pubkey = publicKeyCreate(hexToBytes(this.#privateKey), false).slice(1);
    const keccak = new Keccak256Hasher();
    return '0x' + keccak.update(pubkey.buffer).digest().serializeJson().slice(-40);
  }

  async getAddress(): Promise<string> {
    const config = this.ckitProvider.getScriptConfig('PW_NON_ANYONE_CAN_PAY');
    return this.ckitProvider.parseToAddress({
      code_hash: config.CODE_HASH,
      hash_type: config.HASH_TYPE,
      args: this.getEthAddress(),
    });
  }

  async signMessage(message: HexString): Promise<HexString> {
    const result = key.signRecoverable(hashMessage(message), this.#privateKey);

    let v = Number.parseInt(result.slice(-2), 16);
    if (v >= 27) v -= 27;

    const platform = Platform.eth.toString(16).padStart(2, '0');
    const sig = result.slice(2, -2);

    return '0x' + platform + sig + v.toString(16).padStart(2, '0');
  }
}
