import { HexString } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { AbstractWallet, Signer } from '@ckit/base';
import { EthProvider, Provider as PwProvider, Keccak256Hasher, Platform } from '@lay2/pw-core';
import { CkitProvider } from '../providers';

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

  async getAddress(): Promise<string> {
    const config = this.ckitProvider.getScriptConfig('PW_NON_ANYONE_CAN_PAY');
    return this.ckitProvider.parseToAddress({
      code_hash: config.CODE_HASH,
      hash_type: config.HASH_TYPE,
      args: this.#privateKey,
    });
  }

  async signMessage(message: HexString): Promise<HexString> {
    let result = hashMessage(message);
    result = key.signRecoverable(result, this.#privateKey);

    let v = Number.parseInt(result.slice(-2), 16);
    if (v >= 27) v -= 27;
    result = '0x' + Platform.eth.toString(16).padStart(2, '0') + result.slice(2, -2) + v.toString(16).padStart(2, '0');
    return result;
  }
}
