/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { predefined } from '@ckb-lumos/config-manager';
import { CkitConfig } from '../providers';

export const SCRIPTS: CkitConfig['SCRIPTS'] = {
  SECP256K1_BLAKE160: predefined.LINA.SCRIPTS.SECP256K1_BLAKE160!,
  ANYONE_CAN_PAY: predefined.LINA.SCRIPTS.ANYONE_CAN_PAY!,
  SUDT: predefined.LINA.SCRIPTS.SUDT!,

  /**
   * @deprecated the pw-lock would be replace with rc-lock
   */
  PW_ANYONE_CAN_PAY: {
    CODE_HASH: '0x',
    HASH_TYPE: 'data',
    TX_HASH: '0x',
    INDEX: '0x',
    DEP_TYPE: 'code',
  },
  /**
   * @deprecated the pw-lock would be replace with rc-lock
   */
  PW_NON_ANYONE_CAN_PAY: {
    CODE_HASH: '0x',
    HASH_TYPE: 'data',
    TX_HASH: '0x',
    INDEX: '0x',
    DEP_TYPE: 'code',
  },
  // TODO replace me when deployed
  UNIPASS: {
    INDEX: '0x0',
    TX_HASH: '0x1a04142a2a745fb3b7e0e9b61241676c1c94ad8cdacb36f223661130a23fb007',
    DEP_TYPE: 'code',
    CODE_HASH: '0x614d40a86e1b29a8f4d8d93b9f3b390bf740803fa19a69f1c95716e029ea09b3',
    HASH_TYPE: 'type',
  },

  // TODO deploy the rc lock to test chain
  //  the config here is fake
  RC_LOCK: {
    CODE_HASH: '0x9f3aeaf2fc439549cbc870c653374943af96a0658bd6b51be8d8983183e6f52f',
    HASH_TYPE: 'type',
    TX_HASH: '0xaa8ab7e97ed6a268be5d7e26d63d115fa77230e51ae437fc532988dd0c3ce10a',
    INDEX: '0x1',
    DEP_TYPE: 'code',
  },
};
