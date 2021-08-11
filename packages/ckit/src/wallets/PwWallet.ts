import { HexString } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { AbstractWallet, Signer, WalletFeature } from '@ckit/base';
import { Keccak256Hasher, Platform } from '@lay2/pw-core';
import { publicKeyCreate } from 'secp256k1';
import { CkitProvider } from '../providers';
import { hexToBytes } from '../utils';

declare global {
  interface EthereumProvider {
    selectedAddress: string;
    isMetaMask?: boolean;
    enable: () => Promise<string[]>;
    on: (event: 'accountsChanged', listener: (addresses: string[]) => void) => void;
    request: (payload: { method: 'personal_sign'; params: [string /*from*/, string /*message*/] }) => Promise<string>;
  }

  interface Window {
    ethereum: EthereumProvider;
  }
}

abstract class AbstractPwWallet extends AbstractWallet {
  protected constructor(protected ckitProvider: CkitProvider) {
    super();
    this.setDescriptor({
      features: this.describeFeatures(),
      description: 'Interacting with CKB via MetaMask',
      name: 'NonAcpPwLockWallet',
    });

    this.ckitProvider = ckitProvider;

    if (!window.ethereum) throw new Error('MetaMask is required');

    window.ethereum.on('accountsChanged', (addresses) => {
      if (!Array.isArray(addresses)) return;
      if (addresses.length === 0) {
        this.emitConnectStatusChanged('disconnected');
        return;
      }

      this.emitChangedSigner(this.produceSigner());
    });
  }

  protected tryConnect(): Promise<Signer> {
    return window.ethereum.enable().then(() => this.produceSigner());
  }

  protected abstract produceSigner(): Signer;
  protected abstract describeFeatures(): WalletFeature[];
}

abstract class AbstractPwSigner implements Signer {
  constructor(protected ckitProvider: CkitProvider) {}

  signMessage(message: HexString): Promise<HexString> {
    return new Promise((resolve, reject) => {
      const from = window.ethereum.selectedAddress;

      const handleResult = (result: string): string => {
        let v = Number.parseInt(result.slice(-2), 16);
        if (v >= 27) v -= 27;
        result = '0x' + (1).toString(16).padStart(2, '0') + result.slice(2, -2) + v.toString(16).padStart(2, '0');
        return result;
      };

      void window.ethereum.request({ method: 'personal_sign', params: [from, message] }).then((result) => {
        resolve(handleResult(result));
      }, reject);
    });
  }
  abstract getAddress(): Promise<string>;
}

export class AcpPwLockWallet extends AbstractPwWallet {
  produceSigner(): Signer {
    return new (class extends AbstractPwSigner {
      async getAddress(): Promise<string> {
        const config = this.ckitProvider.getScriptConfig('PW_ANYONE_CAN_PAY');

        return this.ckitProvider.parseToAddress({
          hash_type: config.HASH_TYPE,
          args: window.ethereum.selectedAddress,
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
  produceSigner(): Signer {
    return new (class extends AbstractPwSigner {
      async getAddress(): Promise<string> {
        const config = this.ckitProvider.getScriptConfig('PW_NON_ANYONE_CAN_PAY');

        return this.ckitProvider.parseToAddress({
          hash_type: config.HASH_TYPE,
          args: window.ethereum.selectedAddress,
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

export class InternalNonAcpPwLockSigner implements Signer {
  readonly #privateKey: HexString;
  constructor(privateKey: HexString, private ckitProvider: CkitProvider) {
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
