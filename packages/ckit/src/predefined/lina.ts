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

  UNIPASS: {
    INDEX: '0x0',
    TX_HASH: '0x825e0e2f8c15a4740fb0043116e8aa4e664c2e6a41c79df71ba29c48a7a0ea62',
    DEP_TYPE: 'code',
    CODE_HASH: '0x614d40a86e1b29a8f4d8d93b9f3b390bf740803fa19a69f1c95716e029ea09b3',
    HASH_TYPE: 'type',
  },

  RC_LOCK: {
    CODE_HASH: '0x9f3aeaf2fc439549cbc870c653374943af96a0658bd6b51be8d8983183e6f52f',
    HASH_TYPE: 'type',
    TX_HASH: '0xaa8ab7e97ed6a268be5d7e26d63d115fa77230e51ae437fc532988dd0c3ce10a',
    INDEX: '0x1',
    DEP_TYPE: 'code',
  },

  CHEQUE: {
    CODE_HASH: '0xe4d4ecc6e5f9a059bf2f7a82cca292083aebc0c421566a52484fe2ec51a9fb0c',
    HASH_TYPE: 'type',
    TX_HASH: '0x04632cc459459cf5c9d384b43dee3e36f542a464bdd4127be7d6618ac6f8d268',
    INDEX: '0x0',
    DEP_TYPE: 'dep_group',
  },
};
