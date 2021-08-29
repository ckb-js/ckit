// TODO impl me

import { HexString, Transaction } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { AbstractWallet, EntrySigner } from '@ckit/base';
import { CkitProvider } from '../providers';
import { unimplemented } from '../utils';
import { AbstractSingleEntrySigner } from './AbstractSingleEntrySigner';

export interface RcSigner extends EntrySigner {
  getRcIdentity(): Promise<HexString>;
}

export class RcWallet extends AbstractWallet {
  protected tryConnect(): Promise<RcSigner> {
    unimplemented();
  }
}

export class RcPwSigner implements RcSigner {
  getAddress(): Promise<string> {
    unimplemented();
  }

  seal(_tx: unknown): Promise<Transaction> {
    unimplemented();
  }

  getRcIdentity(): Promise<HexString> {
    unimplemented();
  }
}

export class InternalRcPwSigner implements RcSigner {
  constructor(private privKey: HexString, private provider: CkitProvider) {}

  getAddress(): Promise<string> {
    unimplemented();
  }

  seal(_tx: unknown): Promise<Transaction> {
    unimplemented();
  }

  getRcIdentity(): Promise<HexString> {
    unimplemented();
  }
}
export class RCLockSigner extends AbstractSingleEntrySigner {
  readonly #privateKey: HexString;
  constructor(privateKey: HexString, private ckitProvider: CkitProvider) {
    super({ provider: ckitProvider });
    console.log(`privkey is ${privateKey}`);
    this.#privateKey = privateKey;
  }
  // <flag: 0x0> <pubkey hash 1> <RC lock flags: 2> <2 bytes minimun ckb/udt in ACP>
  async getAddress(): Promise<string> {
    const config = await this.ckitProvider.getScriptConfig('RC_LOCK');
    let pubKeykHash = key.privateKeyToBlake160(this.#privateKey);
    if (pubKeykHash.startsWith('0x')) {
      pubKeykHash = pubKeykHash.substring(2);
    }
    const rc_args = `0x00${pubKeykHash}020000`;
    const address = await this.ckitProvider.parseToAddress({
      code_hash: config.CODE_HASH,
      hash_type: config.HASH_TYPE,
      args: rc_args,
    });
    console.log(`address is ${address},pubkey hash is ${pubKeykHash}, rc args is ${rc_args}`);
    return address;
  }

  async signMessage(message: HexString): Promise<HexString> {
    const signature = key.signRecoverable(message, this.#privateKey);
    return Promise.resolve(signature);
  }
}
