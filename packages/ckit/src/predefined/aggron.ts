/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { predefined } from '@ckb-lumos/config-manager';
import { CkitConfig } from '../providers';

export const SCRIPTS: CkitConfig['SCRIPTS'] = {
  SECP256K1_BLAKE160: predefined.AGGRON4.SCRIPTS.SECP256K1_BLAKE160!,
  ANYONE_CAN_PAY: predefined.AGGRON4.SCRIPTS.ANYONE_CAN_PAY!,
  SUDT: predefined.AGGRON4.SCRIPTS.SUDT!,

  /**
   * @deprecated replace with rc-lock
   */
  PW_ANYONE_CAN_PAY: {
    CODE_HASH: '0x093ba9759e1c4a79dd81b0a50de83ab108ffe4eb983b05637bf1f5c1834f31eb',
    HASH_TYPE: 'data',
    TX_HASH: '0x834d1827950545da5cca779903ca8268aecbc7bfadb1d1cc18ba90f3b312cd41',
    INDEX: '0x2',
    DEP_TYPE: 'code',
  },
  /**
   * @deprecated replace with rc-lock
   */
  PW_NON_ANYONE_CAN_PAY: {
    CODE_HASH: '0x87366c3678f14ccbd6647386a18e05ae27c97978d4a6952fb5820cc698263835',
    HASH_TYPE: 'data',
    TX_HASH: '0x834d1827950545da5cca779903ca8268aecbc7bfadb1d1cc18ba90f3b312cd41',
    INDEX: '0x3',
    DEP_TYPE: 'code',
  },

  UNIPASS: {
    INDEX: '0x0',
    TX_HASH: '0x03dd2a5594ed2d79196b396c83534e050ba0ad07fa5c1cd61a7094f9fb60a592',
    DEP_TYPE: 'code',
    CODE_HASH: '0x124a60cd799e1fbca664196de46b3f7f0ecb7138133dcaea4893c51df5b02be6',
    HASH_TYPE: 'type',
  },

  RC_LOCK: {
    CODE_HASH: '0x79f90bb5e892d80dd213439eeab551120eb417678824f282b4ffb5f21bad2e1e',
    HASH_TYPE: 'type',
    TX_HASH: '0xe563433a510dfae33252eeef81246e94a6638cdb13ff1a3dc3ac7ab8868b6b26',
    INDEX: '0x0',
    DEP_TYPE: 'code',
  },
};
