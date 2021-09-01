// TODO impl me

import { HexString, Transaction } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { AbstractWallet, EntrySigner } from '@ckit/base';
import { CkitProvider } from '../providers';
import {hexToBytes, unimplemented} from '../utils';
import { AbstractSingleEntrySigner } from './AbstractSingleEntrySigner';
import { SerializeRcLockWitnessLock } from '../tx-builders/generated/rc-lock';
import {Reader} from "@lay2/pw-core/build/main/ckb-js-toolkit/reader";
import {Keccak256Hasher} from "@lay2/pw-core";
import {hashMessage} from "./PwWallet";
import {publicKeyCreate} from "secp256k1";

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
export enum RC_MODE{
  // <flag: 0x0> <pubkey hash 1> <RC lock flags: 2> <2 bytes minimun ckb/udt in ACP>
  ACP,
  PUBKEY_HASH

}
export class RCLockSigner extends AbstractSingleEntrySigner {
  readonly #privateKey: HexString;
  constructor(privateKey: HexString, private ckitProvider: CkitProvider) {
    super({ provider: ckitProvider });
    console.log(`privkey is ${privateKey}`);
    this.#privateKey = privateKey;
  }
  async getAddress(): Promise<string> {
    const config = await this.ckitProvider.getScriptConfig('RC_LOCK');
    let pubKeykHash = key.privateKeyToBlake160(this.#privateKey);
    if (pubKeykHash.startsWith('0x')) {
      pubKeykHash = pubKeykHash.substring(2);
    }
    const rc_args = `0x00${pubKeykHash}00`;
    const address = await this.ckitProvider.parseToAddress({
      code_hash: config.CODE_HASH,
      hash_type: config.HASH_TYPE,
      args: rc_args,
    });
    console.log(`address is ${address},pubkey hash is ${pubKeykHash}, rc args is ${rc_args}`);
    return address;
  }

  async getAddressByMode(mode : RC_MODE): Promise<string> {
    let pubKeykHash = key.privateKeyToBlake160(this.#privateKey);
    if (pubKeykHash.startsWith('0x')) {
      pubKeykHash = pubKeykHash.substring(2);
    }
    let rc_args = `0x00${pubKeykHash}00`;

    switch (mode) {
      case RC_MODE.ACP:
        rc_args = `0x00${pubKeykHash}020000`;
        break;
      case RC_MODE.PUBKEY_HASH:
        rc_args = `0x00${pubKeykHash}00`;
        break;
      default:
        Promise.reject(new Error('invalid rc mode'));
    }
    const config = await this.ckitProvider.getScriptConfig('RC_LOCK');
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
    console.log(`msg is ${message}`)
    console.log(`signature is  ${signature.substring(2)},len : ${signature.substring(2).length}`, )
    const params = {
      signature: new Reader(signature)
    };
    const data = '0x'+buf2hex(SerializeRcLockWitnessLock(params));

    console.log(`after signature is ${data}`)
    return Promise.resolve(data);
  }
}
function buf2hex(buffer: ArrayBuffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), (x) => ('00' + x.toString(16)).slice(-2)).join('');
}


export class RCEthSigner extends AbstractSingleEntrySigner {
  readonly #privateKey: HexString;
  constructor(privateKey: HexString, private ckitProvider: CkitProvider) {
    super({ provider: ckitProvider });
    console.log(`privkey is ${privateKey}`);
    this.#privateKey = privateKey;
  }

  async getAddress(): Promise<string> {
    const config = await this.ckitProvider.getScriptConfig('RC_LOCK');
    const pubkey = publicKeyCreate(hexToBytes(this.#privateKey)).slice(1);
    const keccak = new Keccak256Hasher();
    const data = keccak.update(pubkey.buffer).digest().serializeJson();
    console.log(`raw pubkey hash is ${buf2hex(pubkey)}, all hash ${data}`)
    let pubKeykHash =data.slice(-40);
    const rc_args = `0x01${pubKeykHash}00`;
    const address = await this.ckitProvider.parseToAddress({
      code_hash: config.CODE_HASH,
      hash_type: config.HASH_TYPE,
      args: rc_args,
    });
    console.log(`address is ${address},pubkey hash is ${pubKeykHash}, rc args is ${rc_args}`);
    return address;
  }

  async signMessage(message: HexString): Promise<HexString> {
    const result = key.signRecoverable(hashMessage(message), this.#privateKey);
    console.log(`result is ${result} `)

    let v = Number.parseInt(result.slice(-2), 16);
    if (v >= 27) v -= 27;

    const sig = result.slice(2, -2);

    const signature = '0x' + sig + v.toString(16).padStart(2, '0')

    console.log(`msg is ${message}. msg hash is ${hashMessage(message)}`)
    console.log(`signature is  ${signature.substring(2)},len : ${signature.substring(2).length}`, )
    const params = {
      signature: new Reader(result)
    };
    const data = '0x'+buf2hex(SerializeRcLockWitnessLock(params));

    return Promise.resolve(data);
  }
}
