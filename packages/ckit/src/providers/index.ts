import { CkitScriptConfig } from '@ckit/base';
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

  for (const id of scriptFieldArray) {
    const config = <CkitScriptConfig>{
      id: id,
      config: scripts[id],
    };

    if (['PW_ANYONE_CAN_PAY', 'PW_NON_ANYONE_CAN_PAY'].includes(id)) {
      config.extraCellDeps = ['SECP256K1_BLAKE160'];
    }

    if (['SUDT'].includes(id)) {
      config.scriptType = 'type';
    } else {
      config.scriptType = 'lock';
    }

    configs.push(config);
  }
  return configs;
}

export * from './mercury/MercuryProvider';
export * from './CkitProvider';
