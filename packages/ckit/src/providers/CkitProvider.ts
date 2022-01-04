import { Address, CellDep, Script, utils } from '@ckb-lumos/base';
import { ScriptConfig } from '@ckb-lumos/config-manager';
import { ProviderConfig, InitOptions } from '@ckitjs/base';
import { MercuryProvider } from './mercury/MercuryProvider';

export interface CkitConfig extends ProviderConfig {
  SCRIPTS: {
    // lock
    SECP256K1_BLAKE160: ScriptConfig;
    ANYONE_CAN_PAY: ScriptConfig;
    UNIPASS: ScriptConfig;
    /**
     * @deprecated replace with rc-lock
     */
    PW_NON_ANYONE_CAN_PAY: ScriptConfig;
    /**
     * @deprecated replace with rc-lock
     */
    PW_ANYONE_CAN_PAY: ScriptConfig;
    RC_LOCK: ScriptConfig;
    CHEQUE: ScriptConfig;

    // type
    SUDT: ScriptConfig;
  };
}
export type CkitInitOptions = InitOptions<CkitConfig>;
export type CkitConfigKeys = keyof CkitConfig['SCRIPTS'];

export class CkitProvider extends MercuryProvider {
  override get config(): CkitConfig {
    return super.config as CkitConfig;
  }

  override init(config: CkitInitOptions): Promise<void> {
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

  newScriptTemplate(configKey: CkitConfigKeys): Omit<Script, 'args'> {
    const template = this.newScript(configKey);
    return {
      code_hash: template.code_hash,
      hash_type: template.hash_type,
    };
  }

  newSudtScript(issuer: Address | Script): Script {
    const issuerLockHash =
      typeof issuer === 'string'
        ? utils.computeScriptHash(this.parseToScript(issuer))
        : utils.computeScriptHash(issuer);

    return this.newScript('SUDT', issuerLockHash);
  }

  override getCellDep(configKey: CkitConfigKeys): CellDep {
    const dep = super.getCellDep(configKey);
    if (!dep) throw new Error(`cannot find the ${configKey} script config, maybe init failed`);

    return dep;
  }

  isTemplateOf(key: CkitConfigKeys, scriptLice: Script | Address): boolean {
    const script = typeof scriptLice === 'string' ? this.parseToScript(scriptLice) : scriptLice;
    const scriptConfig = this.getScriptConfig(key);

    return scriptConfig.CODE_HASH === script.code_hash && scriptConfig.HASH_TYPE === script.hash_type;
  }
}
