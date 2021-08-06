/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { predefined, ScriptConfig } from '@ckb-lumos/config-manager';
import { CHAIN_SPECS } from '@lay2/pw-core';
import { CkitConfig } from '../providers/CkitProvider';

function toScriptConfig(obj: typeof CHAIN_SPECS.Aggron.pwLock): ScriptConfig {
  return {
    CODE_HASH: obj.script.codeHash,
    HASH_TYPE: obj.script.hashType,
    DEP_TYPE: obj.cellDep.depType,
    TX_HASH: obj.cellDep.outPoint.txHash,
    INDEX: obj.cellDep.outPoint.index,
  };
}

export const SCRIPTS: CkitConfig['SCRIPTS'] = {
  SECP256K1_BLAKE160: predefined.AGGRON4.SCRIPTS.SECP256K1_BLAKE160!,
  ANYONE_CAN_PAY: predefined.AGGRON4.SCRIPTS.ANYONE_CAN_PAY!,
  SUDT: predefined.AGGRON4.SCRIPTS.SUDT!,

  // TODO replace me when deployed
  PW_ANYONE_CAN_PAY: toScriptConfig(CHAIN_SPECS.Aggron.pwLock),
  // TODO replace me when deployed
  PW_NON_ANYONE_CAN_PAY: toScriptConfig(CHAIN_SPECS.Aggron.pwLock),
  // TODO replace me when deployed
  UNIPASS: {
    INDEX: '0x0',
    TX_HASH: '0x03dd2a5594ed2d79196b396c83534e050ba0ad07fa5c1cd61a7094f9fb60a592',
    DEP_TYPE: 'code',
    CODE_HASH: '0x124a60cd799e1fbca664196de46b3f7f0ecb7138133dcaea4893c51df5b02be6',
    HASH_TYPE: 'type',
  },
};
