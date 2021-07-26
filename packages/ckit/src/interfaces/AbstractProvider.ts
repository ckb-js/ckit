import { Address, ChainInfo, Hash, HexNumber, Script, Transaction } from '@ckb-lumos/base';
import { predefined, Config, ScriptConfig } from '@ckb-lumos/config-manager';
import { generateAddress } from '@ckb-lumos/helpers';
import { Provider, ResolvedOutpoint } from './';

export abstract class AbstractProvider implements Provider {
  private initialied = false;
  private _config: Config | undefined;

  get config(): Config {
    if (!this._config) throw new Error('Cannot find the config, maybe provider is not initialied');
    return this._config;
  }

  getScriptConfig(key: string): ScriptConfig | undefined {
    return this.config.SCRIPTS[key];
  }

  /**
   * init the provider
   * @param config if no config is provided, {@link getChainInfo} will be called to check the network type, and using the predefined config
   */
  async init(config?: Config): Promise<void> {
    if (this.initialied) return;

    if (config) {
      this._config = config;
    } else {
      const chainInfo = await this.getChainInfo();
      const isMainnet = chainInfo.chain === 'ckb';

      this._config = isMainnet ? predefined.LINA : predefined.AGGRON4;
    }

    this.initialied = true;
  }

  parseToAddress(script: Script): string {
    return generateAddress(script, { config: this.config });
  }

  abstract getChainInfo(): Promise<ChainInfo>;
  abstract collectCkbLiveCell(lock: Address, capacity: HexNumber): Promise<ResolvedOutpoint[]>;
  abstract sendTransaction(tx: Transaction): Promise<Hash>;
}
