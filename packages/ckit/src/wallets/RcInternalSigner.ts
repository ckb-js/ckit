import { HexString } from '@ckb-lumos/base';
import { key } from '@ckb-lumos/hd';
import { SerializeRcLockWitnessLock } from '@ckit/rc-lock';
import { bytes } from '@ckit/utils';
import { Reader } from 'ckb-js-toolkit';
import { CkitProvider } from '../providers';
import { RcIdentity, RcIdentityFlag } from '../tx-builders';
import { AbstractSingleEntrySigner } from './AbstractSingleEntrySigner';
import { RcSigner } from './RcOwnerWallet';

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
