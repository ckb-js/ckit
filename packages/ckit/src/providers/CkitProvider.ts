import { Config, ScriptConfig } from '@ckb-lumos/config-manager';
import { MercuryProvider } from './MercuryProvider';

export interface CkitConfig extends Config {
  SCRIPTS: {
    SECP256K1_BLAKE160: ScriptConfig;
    ANYONE_CAN_PAY: ScriptConfig;
    SUDT: ScriptConfig;
    PW_NON_ANYONE_CAN_PAY: ScriptConfig;
    PW_ANYONE_CAN_PAY: ScriptConfig;
  };
}

export class CkitProvider extends MercuryProvider {
  override get config(): CkitConfig {
    return super.config as CkitConfig;
  }

  override getScriptConfig(key: keyof CkitConfig['SCRIPTS']): ScriptConfig {
    const scriptConfig = super.getScriptConfig(key);
    if (!scriptConfig) throw new Error(`cannot find the ${key} script config, maybe init failed`);
    return scriptConfig;
  }
}
