import { Script, HexString } from '@ckb-lumos/base';
import { ScriptConfig } from '@ckb-lumos/config-manager';
import { CellDep } from '@lay2/pw-core';

export interface CkitScriptConfig {
  field: string;
  script: ScriptConfig;
  witnessPlaceHolder?: HexString;
  extraCellDeps?: CellDep[];
}

export class ScriptConfigManager {
  private configs: CkitScriptConfig[];

  constructor() {
    this.configs = new Array<CkitScriptConfig>();
  }

  getScriptConfigByScript(script: Script): CkitScriptConfig {
    for (const config of this.configs) {
      if (config.script.CODE_HASH === script.code_hash && config.script.HASH_TYPE === script.hash_type) {
        return config;
      }
    }
    throw new Error(`script ${script.code_hash} ${script.hash_type} not registered`);
  }

  getScriptDeps(script: Script): CellDep[] {
    const ckitScriptConfig = this.getScriptConfigByScript(script);
    const cellDeps = new Array<CellDep>();
    const selfDep = <CellDep>{
      outPoint: {
        txHash: ckitScriptConfig.script.TX_HASH,
        index: ckitScriptConfig.script.INDEX,
      },
      depType: ckitScriptConfig.script.DEP_TYPE,
    };
    cellDeps.push(selfDep);
    if (ckitScriptConfig.extraCellDeps) {
      cellDeps.push(...ckitScriptConfig.extraCellDeps);
    }
    return cellDeps;
  }

  getScriptsDeps(scripts: Script[]): CellDep[] {
    const cellDeps = new Array<CellDep>();
    for (const script of scripts) {
      const deps = this.getScriptDeps(script);
      deps.map((d) => {
        if (!this.isDuplicateDep(d, cellDeps)) cellDeps.push(d);
      });
    }
    return cellDeps;
  }

  isDuplicateDep(dep: CellDep, deps: CellDep[]): boolean {
    for (const d of deps) {
      if (
        d.outPoint.txHash === dep.outPoint.txHash &&
        d.outPoint.index === dep.outPoint.index &&
        d.depType === dep.depType
      )
        return true;
    }
    return false;
  }

  getLockScriptWitnessPlaceholder(script: Script): HexString {
    const ckitScriptConfig = this.getScriptConfigByScript(script);
    if (!ckitScriptConfig.witnessPlaceHolder) {
      throw new Error("script doesn't need witness");
    }
    return ckitScriptConfig.witnessPlaceHolder;
  }

  register(config: CkitScriptConfig[]): void {
    this.configs.push(...config);
  }
}
