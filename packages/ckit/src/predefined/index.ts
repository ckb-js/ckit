import { CkitInitOptions } from '../providers';
import * as Aggron from './aggron';
import * as Lina from './lina';

const AggronCkitConfig: CkitInitOptions = {
  PREFIX: 'ckt',
  SCRIPTS: Aggron.SCRIPTS,
  FUTURE_SCRIPTS: {},
};

const LinaCkitConfig: CkitInitOptions = {
  PREFIX: 'ckb',
  SCRIPTS: Lina.SCRIPTS,
  FUTURE_SCRIPTS: {},
};

export const predefined: Record<'Aggron' | 'Lina', CkitInitOptions> = {
  Aggron: AggronCkitConfig,
  Lina: LinaCkitConfig,
};
