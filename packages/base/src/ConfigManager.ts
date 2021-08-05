import { CellDep, Script, WitnessArgs } from '@ckb-lumos/base';

export interface ConfigManager {
  getScriptsCellDeps(scripts: Script[]): CellDep[];
  getWitnessPlaceholder(script: Script): WitnessArgs;
}
