import { CkitScriptConfig } from '@ckit/base';
import { CellDep } from '@lay2/pw-core';
import { CkitConfig } from './CkitProvider';

export function getScriptConfig(scripts: CkitConfig['SCRIPTS']): CkitScriptConfig[] {
  const configs = new Array<CkitScriptConfig>();

  const scriptFieldArray: (keyof CkitConfig['SCRIPTS'])[] = [
    'ANYONE_CAN_PAY',
    'PW_ANYONE_CAN_PAY',
    'PW_NON_ANYONE_CAN_PAY',
    'SECP256K1_BLAKE160',
    'SUDT',
    'UNIPASS',
  ];

  for (const field of scriptFieldArray) {
    const config = <CkitScriptConfig>{
      field: field,
      script: scripts[field],
    };

    if (['PW_ANYONE_CAN_PAY', 'PW_NON_ANYONE_CAN_PAY'].includes(field)) {
      config.extraCellDeps = [
        <CellDep>{
          outPoint: {
            txHash: scripts['SECP256K1_BLAKE160'].TX_HASH,
            index: scripts['SECP256K1_BLAKE160'].INDEX,
          },
          depType: scripts['SECP256K1_BLAKE160'].DEP_TYPE,
        },
      ];
    }
    configs.push(config);
  }
  return configs;
}

export * from './mercury/MercuryProvider';
export * from './CkitProvider';
