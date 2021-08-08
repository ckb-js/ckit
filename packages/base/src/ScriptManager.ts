import { CellDep, Script, WitnessArgs } from '@ckb-lumos/base';
import { ScriptConfig } from '@ckb-lumos/config-manager';

export interface ScriptManager {
  getScriptsCellDeps(scripts: Script[]): CellDep[];
  getWitnessPlaceholder(script: Script): WitnessArgs;

  getScriptConfig(key: string): ScriptConfig;
  newScript(key: string): Script;
}
