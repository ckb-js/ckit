import { CkitInitOptions } from '../providers';
import * as Aggron from './aggron';

const AggronCkitConfig: CkitInitOptions = {
  PREFIX: 'ckt',
  SCRIPTS: Aggron.SCRIPTS,
};

export const predefined = {
  Aggron: AggronCkitConfig,
};
