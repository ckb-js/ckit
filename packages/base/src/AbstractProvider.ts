import {
  Address,
  Cell,
  CellDep,
  ChainInfo,
  Hash,
  HexNumber,
  HexString,
  Input,
  Script,
  Transaction,
  TxPoolInfo,
} from '@ckb-lumos/base';
import { Indexer } from '@ckb-lumos/ckb-indexer';
import { predefined, ScriptConfig } from '@ckb-lumos/config-manager';
import { encodeToAddress, generateAddress, parseAddress } from '@ckb-lumos/helpers';
import { RPC } from '@ckb-lumos/rpc';
import { CellOutPointProvider, KnownCellOutPointProvider } from './CellOutPointProvider';
import { ProviderConfig, InitOptions } from './ProviderTypes';
import { generateTypeIdScript } from './typeid';
import { Provider, ResolvedOutpoint } from './';

export abstract class AbstractProvider implements Provider {
  private initialized = false;
  private _config: ProviderConfig | undefined;
  readonly rpc: RPC;
  readonly rpcUrl: string;
  readonly indexer;
  readonly indexerUrl: string;

  constructor(ckbRpc = 'http://127.0.0.1:8114', indexerUrl = 'http://127.0.0.1:8116') {
    this.rpc = new RPC(ckbRpc);
    this.rpcUrl = ckbRpc;
    this.indexer = new Indexer(indexerUrl, ckbRpc);
    this.indexerUrl = indexerUrl;
  }

  get config(): ProviderConfig {
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

  newTypeIdScript(args: HexString): Script {
    return {
      code_hash: '0x00000000000000000000000000000000000000000000000000545950455f4944', // Buffer.from('TYPE_ID')
      hash_type: 'type',
      args,
    };
  }

  generateTypeIdScript(input: Input, outputIndex: HexNumber): Script {
    return generateTypeIdScript(input, outputIndex);
  }

  async getCellDep(configKey: string, fetchLatest = false): Promise<CellDep | undefined> {
    const scriptConfig = this.getScriptConfig(configKey);
    if (!scriptConfig) return undefined;

    const outPoint = { tx_hash: scriptConfig.TX_HASH, index: scriptConfig.INDEX };
    const depCellStatus = await this.rpc.get_live_cell(outPoint, false);
    if (depCellStatus.status === 'live') {
      return {
        dep_type: scriptConfig.DEP_TYPE,
        out_point: outPoint,
      };
    } else {
      const typeScript = depCellStatus.cell?.output.type;
      if (!typeScript) return undefined;
      let cellOutPointProvider: CellOutPointProvider;
      if (!fetchLatest) {
        cellOutPointProvider = new KnownCellOutPointProvider(this.rpcUrl, this.indexerUrl, this.config);
      } else {
        cellOutPointProvider = new KnownCellOutPointProvider(this.rpcUrl, this.indexerUrl, this.config);
      }
      const outPoint = await cellOutPointProvider.getOutPointByType(typeScript);
      if (!outPoint) return undefined;
      return {
        dep_type: scriptConfig.DEP_TYPE,
        out_point: outPoint,
      };
    }
  }

  findCellDepByAddress(address: Address): CellDep | undefined {
    const script = this.parseToScript(address);
    const scriptConfigs = Object.values(this.config.SCRIPTS) as ScriptConfig[];

    if (scriptConfigs == null) return undefined;

    const index = scriptConfigs.findIndex(
      (scriptConfig) => scriptConfig?.CODE_HASH === script.code_hash && scriptConfig?.HASH_TYPE === script.hash_type,
    );
    const found = scriptConfigs[index];
    if (!found) return undefined;

    return { dep_type: found.DEP_TYPE, out_point: { tx_hash: found.TX_HASH, index: found.INDEX } };
  }

  findCellDepByScript(script: Script): CellDep | undefined {
    return this.findCellDepByAddress(this.parseToAddress(script));
  }

  /**
   * init the provider
   * @param config if no config is provided, {@link getChainInfo} will be called to check the network type, and using the predefined config
   */
  async init(config?: InitOptions): Promise<void> {
    if (this.initialized) return;

    if (config) {
      const MIN_FEE_RATE = config.MIN_FEE_RATE ? config.MIN_FEE_RATE : (await this.getTxPoolInfo()).min_fee_rate;
      this._config = { ...config, MIN_FEE_RATE };
    } else {
      const chainInfo = await this.getChainInfo();
      const isMainnet = chainInfo.chain === 'ckb';
      const txPoolInfo = await this.getTxPoolInfo();

      this._config = isMainnet
        ? { ...predefined.LINA, MIN_FEE_RATE: txPoolInfo.min_fee_rate }
        : { ...predefined.AGGRON4, MIN_FEE_RATE: txPoolInfo.min_fee_rate };
    }

    this.initialized = true;
  }

  /**
   * parse a script to address, defaults to parse to CKB2019 address
   * @param script
   * @param options
   */
  parseToAddress(script: Script, options?: { version: 'CKB2019' | 'CKB2021' }): Address {
    if (options?.version === 'CKB2021') return encodeToAddress(script, { config: this.config });
    return generateAddress(script, { config: this.config });
  }

  /**
   * parse an {@link Address} to script, throws an error when parsing failed
   * @param address
   */
  parseToScript(address: Address): Script {
    return parseAddress(address, { config: this.config });
  }

  abstract getTxPoolInfo(): Promise<TxPoolInfo>;
  abstract getChainInfo(): Promise<ChainInfo>;
  /**
   * @deprecated please migrate to {@link collectLockOnlyCells}
   * @param lock
   * @param capacity
   */
  abstract collectCkbLiveCells(lock: Address, capacity: HexNumber): Promise<ResolvedOutpoint[]>;
  /**
   *
   * @param lock
   * @param capacity
   */
  abstract collectLockOnlyCells(lock: Address, capacity: HexNumber): Promise<Cell[]>;
  abstract sendTransaction(tx: Transaction): Promise<Hash>;
}
