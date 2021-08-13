import { Address, CellDep, Script, utils } from '@ckb-lumos/base';
import { ScriptConfig } from '@ckb-lumos/config-manager';
import { ProviderConfig, InitOptions, ScriptConfigManager } from '@ckit/base';
import { MercuryProvider } from './mercury/MercuryProvider';
import { getScriptConfig } from './index';

export interface CkitConfig extends ProviderConfig {
  SCRIPTS: {
    // lock
    SECP256K1_BLAKE160: ScriptConfig;
    ANYONE_CAN_PAY: ScriptConfig;
    UNIPASS: ScriptConfig;
    PW_NON_ANYONE_CAN_PAY: ScriptConfig;
    PW_ANYONE_CAN_PAY: ScriptConfig;

    // type
    SUDT: ScriptConfig;
  };
}
export type CkitInitOptions = InitOptions<CkitConfig>;
export type CkitConfigKeys = keyof CkitConfig['SCRIPTS'];

export class CkitProvider extends MercuryProvider {
  private _scriptManager: ScriptConfigManager | undefined;

  override get config(): CkitConfig {
    return super.config as CkitConfig;
  }

  get scriptManager(): ScriptConfigManager {
    if (!this._scriptManager) throw new Error('Cannot find the scriptManager, maybe provider is not initialied');
    return this._scriptManager;
  }

  //TODO replace config with scriptConfigManager
  override init(config: CkitInitOptions): Promise<void> {
    const scriptConfig = getScriptConfig(config.SCRIPTS);
    this._scriptManager = new ScriptConfigManager();
    this._scriptManager.register(scriptConfig);
    return super.init(config);
  }

  override getScriptConfig(key: CkitConfigKeys): ScriptConfig {
    const scriptConfig = super.getScriptConfig(key);
    if (!scriptConfig) throw new Error(`cannot find the ${key} script config, maybe init failed`);
    return scriptConfig;
  }

  override newScript(configKey: CkitConfigKeys, args = '0x'): Script {
    const script = super.newScript(configKey, args);
    if (!script) throw new Error(`cannot find the ${configKey} script config, maybe init failed`);

    return script;
  }

  newSudtScript(issuerAddress: Address): Script {
    const issuerLockHash = utils.computeScriptHash(this.parseToScript(issuerAddress));

    return this.newScript('SUDT', issuerLockHash);
  }

  override getCellDep(configKey: CkitConfigKeys): CellDep {
    const dep = super.getCellDep(configKey);
    if (!dep) throw new Error(`cannot find the ${configKey} script config, maybe init failed`);

    return dep;
  }
}
