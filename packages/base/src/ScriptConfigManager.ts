import { Script, HexString } from '@ckb-lumos/base';
import { ScriptConfig } from '@ckb-lumos/config-manager';
import { CellDep } from '@lay2/pw-core';

export interface LockScriptInfo {
  // e.g SECP256K1_BLAKE160
  id: string;
  // human-readable info for the script
  description?: string;
  scriptType: 'lock';
  config: ScriptConfig;
  witnessPlaceHolder?: HexString;
  // reference id
  extraCellDeps: string[];
}

export interface TypeScriptInfo {
  // e.g SUDT
  id: string;
  // human-readable info for the script
  description?: string;
  scriptType: 'type';
  config: ScriptConfig;
  // TODO
  // witnessPlaceHolder?: {};
  // reference id
  extraCellDeps: string[];
}

export type CkitScriptConfig = LockScriptInfo | TypeScriptInfo;

export class ScriptConfigManager {
  private ckitScriptConfigs: CkitScriptConfig[];

  constructor() {
    this.ckitScriptConfigs = new Array<CkitScriptConfig>();
  }

  getScriptConfig(identity: Script | string): CkitScriptConfig {
    for (const c of this.ckitScriptConfigs) {
      if (typeof identity === 'string') {
        if (c.id === identity) return c;
      } else {
        if (c.config.CODE_HASH === identity.code_hash && c.config.HASH_TYPE === identity.hash_type) return c;
      }
    }

    throw new Error(`script ${JSON.stringify(identity)} not registered`);
  }

  getScriptDeps(identity: Script | string): CellDep[] {
    const ckitScriptConfig = this.getScriptConfig(identity);
    const cellDeps = new Array<CellDep>();
    const selfDep = <CellDep>{
      outPoint: {
        txHash: ckitScriptConfig.config.TX_HASH,
        index: ckitScriptConfig.config.INDEX,
      },
      depType: ckitScriptConfig.config.DEP_TYPE,
    };
    cellDeps.push(selfDep);
    if (ckitScriptConfig.extraCellDeps) {
      ckitScriptConfig.extraCellDeps.map((d) => {
        cellDeps.push(...this.getScriptDeps(d));
      });
    }
    return cellDeps;
  }

  getScriptsDeps(scripts: Script[] | string[]): CellDep[] {
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

  getLockScriptWitnessPlaceholder(script: Script | string): HexString {
    const ckitScriptConfig = this.getScriptConfig(script);
    if (ckitScriptConfig.scriptType === 'lock' && ckitScriptConfig.witnessPlaceHolder)
      return ckitScriptConfig.witnessPlaceHolder;
    else throw new Error(`script ${script} can not load witness place holder`);
  }

  register(config: CkitScriptConfig[]): void {
    this.ckitScriptConfigs.push(...config);
  }
}
