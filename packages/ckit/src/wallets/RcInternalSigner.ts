import {HexString} from '@ckb-lumos/base';
import {key} from '@ckb-lumos/hd';
import {SerializeRcLockWitnessLock} from '@ckit/rc-lock';
import {bytes} from '@ckit/utils';
import {Keccak256Hasher} from '@lay2/pw-core';
import {Reader} from 'ckb-js-toolkit';
import {publicKeyCreate} from 'secp256k1';
import {CkitProvider} from '../providers';
import {RcIdentity, RcIdentityFlag} from '../tx-builders';
import {hexToBytes} from '../utils';
import {AbstractSingleEntrySigner} from './AbstractSingleEntrySigner';
import {hashMessage} from './PwWallet';
import {RcSigner} from './RcOwnerWallet';

/**
 * Please do not use this signer directly in a production environment,
 * as it can only be used for testing purposes.
 */
export class RcInternalSigner extends AbstractSingleEntrySigner implements RcSigner {
  readonly #privateKey: HexString;

  constructor(privateKey: HexString, private ckitProvider: CkitProvider) {
    super({ provider: ckitProvider });
    this.#privateKey = privateKey;
  }

  getRcIdentity(): RcIdentity {
    return {
      flag: RcIdentityFlag.CKB,
      // pubkeyHash: this.getEthAddress(),
      pubkeyHash: key.privateKeyToBlake160(this.#privateKey),
    };
  }

  getAddress(): string {
    const config = this.ckitProvider.getScriptConfig('RC_LOCK');
    return this.ckitProvider.parseToAddress({
      code_hash: config.CODE_HASH,
      hash_type: config.HASH_TYPE,
      args: bytes.concat(this.getRcIdentity().flag, this.getRcIdentity().pubkeyHash, 0),
    });
  }

  async signMessage(message: HexString): Promise<HexString> {
    const signature = key.signRecoverable(message, this.#privateKey);
    return Promise.resolve(
      new Reader(SerializeRcLockWitnessLock({ signature: new Reader(signature) })).serializeJson(),
    );
  }
}

export enum RC_MODE {
  // <flag: 0x0> <pubkey hash 1> <RC lock flags: 0>
  PUBKEY_HASH = '00',
  // <flag: 0x0> <pubkey hash 1> <RC lock flags: 2> <2 bytes minimun ckb/udt in ACP>
  ACP = '02',
}
export class RCLockSigner extends AbstractSingleEntrySigner implements RcSigner {
  readonly #privateKey: HexString;
  constructor(privateKey: HexString, private ckitProvider: CkitProvider) {
    super({ provider: ckitProvider });
    this.#privateKey = privateKey;
  }

  getRcIdentity(): RcIdentity {
    return {
      flag: RcIdentityFlag.CKB,
      // pubkeyHash: this.getEthAddress(),
      pubkeyHash: key.privateKeyToBlake160(this.#privateKey),
    };
  }

  async getAddress(): Promise<string> {
    return await this.getAddressByMode(RC_MODE.ACP);
  }

  async getAddressByMode(mode: RC_MODE): Promise<string> {
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
        return Promise.reject(new Error('invalid rc mode'));
    }
    const config = await this.ckitProvider.getScriptConfig('RC_LOCK');
    return this.ckitProvider.parseToAddress({
      code_hash: config.CODE_HASH,
      hash_type: config.HASH_TYPE,
      args: rc_args,
    });
  }
  async signMessage(message: HexString): Promise<HexString> {
    const signature = key.signRecoverable(message, this.#privateKey);
    return Promise.resolve(
      new Reader(SerializeRcLockWitnessLock({ signature: new Reader(signature) })).serializeJson(),
    );
  }
}

export class RCEthSigner extends AbstractSingleEntrySigner implements RcSigner {
  readonly #privateKey: HexString;
  constructor(privateKey: HexString, private ckitProvider: CkitProvider) {
    super({ provider: ckitProvider });
    console.log(`privkey is ${privateKey}`);
    this.#privateKey = privateKey;
  }

  getRcIdentity(): RcIdentity {
    return {
      flag: RcIdentityFlag.ETH,
      pubkeyHash: this.getEthAddress(),
    };
  }
  async getAddress(): Promise<string> {
    const config = await this.ckitProvider.getScriptConfig('RC_LOCK');
    const ethAddress = this.getEthAddress();
    const rc_args = `0x01${ethAddress.substring(2)}00`;
    return this.ckitProvider.parseToAddress({
      code_hash: config.CODE_HASH,
      hash_type: config.HASH_TYPE,
      args: rc_args,
    });
  }
  getEthAddress(): string {
    const pubkey = publicKeyCreate(hexToBytes(this.#privateKey), false).slice(1);
    const keccak = new Keccak256Hasher();
    return '0x' + keccak.update(pubkey.buffer).digest().serializeJson().slice(-40);
  }

  async signMessage(message: HexString): Promise<HexString> {
    const result = key.signRecoverable(hashMessage(message), this.#privateKey);
    let v = Number.parseInt(result.slice(-2), 16);
    if (v >= 27) v -= 27;
    const sig = result.slice(2, -2);
    const signature = '0x' + sig + v.toString(16).padStart(2, '0');
    return Promise.resolve(
        new Reader(SerializeRcLockWitnessLock({ signature: new Reader(signature) })).serializeJson(),
    );
  }
}
