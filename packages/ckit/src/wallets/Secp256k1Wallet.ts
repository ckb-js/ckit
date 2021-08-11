import { HexString, Script } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { AbstractWallet, Signer } from '@ckit/base';
import { MercuryProvider } from '../providers';

type ScriptTmpl = Pick<Script, 'hash_type' | 'code_hash'>;

export class Secp256k1Wallet extends AbstractWallet {
  readonly #privateKey: string;

  constructor(privateKey: string, private provider: MercuryProvider, private lockConfig: ScriptTmpl) {
    super();
    this.setDescriptor({ features: ['issue-sudt'] });
    this.#privateKey = privateKey;
  }

  protected async tryConnect(): Promise<Signer> {
    return new Secp256k1Signer(this.#privateKey, this.provider, this.lockConfig);
  }
}

export class Secp256k1Signer implements Signer {
  static privateKeyToBlake160(privateKey: string): string {
    return key.privateKeyToBlake160(privateKey);
  }

  readonly #privateKey: string;

  constructor(privateKey: string, private provider: MercuryProvider, private lockConfig: ScriptTmpl) {
    this.#privateKey = privateKey;
  }

  getAddress(): Promise<string> {
    return Promise.resolve(
      this.provider.parseToAddress({
        ...this.lockConfig,
        args: Secp256k1Signer.privateKeyToBlake160(this.#privateKey),
      }),
    );
  }

  signMessage(message: HexString): Promise<HexString> {
    return Promise.resolve(key.signRecoverable(message, this.#privateKey));
  }
}
