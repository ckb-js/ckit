import { HexString } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { AbstractWallet, Signer } from '@ckit/base';
import { EthProvider, Provider as PwProvider, Keccak256Hasher, Platform } from '@lay2/pw-core';
import { publicKeyCreate, ecdsaSign } from 'secp256k1';
import { CkitProvider } from '../providers';
import { hexToBytes } from '../utils';

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

export function hashMessage(message: HexString): string {
  // https://github.com/XuJiandong/pw-lock/blob/develop/c/pw_chain_ethereum.h#L43
  return new Keccak256Hasher().update('\x19Ethereum Signed Message:\n32').update(message).digest().serializeJson();
}

export class InternalNonAcpPwLockSigner implements Signer {
  readonly #privateKey: HexString;
  constructor(privateKey: HexString, private ckitProvider: CkitProvider) {
    this.#privateKey = privateKey;
  }

  getEthAddress(): string {
    const pubkey = publicKeyCreate(hexToBytes(this.#privateKey), false).slice(1);
    const keccak = new Keccak256Hasher();
    return (
      '0x' +
      keccak
        .hash(pubkey.buffer as Uint8Array)
        .serializeJson()
        .slice(-40)
    );
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
