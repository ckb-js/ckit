import { Address, CellDep, ChainInfo, Hash, HexNumber, HexString, Script, Transaction } from '@ckb-lumos/base';
import { predefined, Config, ScriptConfig } from '@ckb-lumos/config-manager';
import { generateAddress, parseAddress } from '@ckb-lumos/helpers';
import { Provider, ResolvedOutpoint } from './';

export abstract class AbstractProvider implements Provider {
  private initialized = false;
  private _config: Config | undefined;

  get config(): Config {
    if (!this._config) throw new Error('Cannot find the config, maybe provider is not initialied');
    return this._config;
  }

  getScriptConfig(key: string): ScriptConfig | undefined {
    return this.config.SCRIPTS[key];
  }

  newScript(configKey: string, args: HexString): Script | undefined {
    const scriptConfig = this.getScriptConfig(configKey);
    if (!scriptConfig) return undefined;

    return { code_hash: scriptConfig.CODE_HASH, args, hash_type: scriptConfig.HASH_TYPE };
  }

  getCellDep(configKey: string): CellDep | undefined {
    const scriptConfig = this.getScriptConfig(configKey);
    if (!scriptConfig) return undefined;

    return {
      dep_type: scriptConfig.DEP_TYPE,
      out_point: { tx_hash: scriptConfig.TX_HASH, index: scriptConfig.INDEX },
    };
  }

  /**
   * init the provider
   * @param config if no config is provided, {@link getChainInfo} will be called to check the network type, and using the predefined config
   */
  async init(config?: Config): Promise<void> {
    if (this.initialized) return;

    if (config) {
      this._config = config;
    } else {
      const chainInfo = await this.getChainInfo();
      const isMainnet = chainInfo.chain === 'ckb';

      this._config = isMainnet ? predefined.LINA : predefined.AGGRON4;
    }

    this.initialized = true;
  }

  parseToAddress(script: Script): Address {
    return generateAddress(script, { config: this.config });
  }

  parseToScript(address: Address): Script {
    return parseAddress(address, { config: this.config });
  }

  abstract getChainInfo(): Promise<ChainInfo>;
  abstract collectCkbLiveCells(lock: Address, capacity: HexNumber): Promise<ResolvedOutpoint[]>;
  abstract sendTransaction(tx: Transaction): Promise<Hash>;
}
