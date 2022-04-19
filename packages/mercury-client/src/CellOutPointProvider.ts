import { OutPoint, Script } from '@ckb-lumos/base';
import { RPC } from '@ckb-lumos/rpc';
import { ProviderConfig, OutPointOpt, PromisableOutPointOpt, CellOutPointProvider } from '@ckitjs/base';

type CheckConfigResult = {
  shouldReturnOriginalOutput: boolean;
  originalOutPoint: OutPoint;
};
export abstract class BaseCellOutPointProvider implements CellOutPointProvider {
  config: ProviderConfig;
  rpc: RPC;
  rpcUrl: string;
  upgradableScripts: Array<string>;

  constructor(
    config: ProviderConfig,
    rpcUrl = 'http://127.0.0.1:8114',
    upgradableScripts: Array<string> = ['RC_LOCK'],
  ) {
    this.config = config;
    this.rpcUrl = rpcUrl;
    this.rpc = new RPC(rpcUrl);
    this.upgradableScripts = upgradableScripts;
  }

  protected async getTypeIdByOutPoint(outPoint: OutPoint): Promise<Script> {
    const liveCellTx = await this.rpc.get_transaction(outPoint.tx_hash);
    const type = liveCellTx?.transaction.outputs[Number(outPoint.index)]?.type;
    if (type === undefined) throw new Error(`Can't find the typeId in tx ${outPoint.tx_hash}, index ${outPoint.index}`);
    return type;
  }

  protected async checkConfigByKey(configKey: string): Promise<CheckConfigResult> {
    const scriptConfig = this.config.SCRIPTS[configKey];
    if (!scriptConfig) {
      throw new Error(
        `Cannot find the config by key: ${configKey}, maybe configKey is wrong or provider is not initialied`,
      );
    }

    const checkConfigResult: CheckConfigResult = {
      shouldReturnOriginalOutput: true,
      originalOutPoint: { tx_hash: scriptConfig.TX_HASH, index: scriptConfig.INDEX },
    };

    if (this.upgradableScripts.includes(configKey)) {
      const depCellStatus = await this.rpc.get_live_cell(checkConfigResult.originalOutPoint, false);
      if (depCellStatus.status !== 'live') {
        checkConfigResult.shouldReturnOriginalOutput = false;
      }
    }

    return checkConfigResult;
  }
  abstract getScriptDep(configKey: string): PromisableOutPointOpt;
}

export class DefaultOutPointProvider extends BaseCellOutPointProvider {
  getScriptDep(configKey: string): OutPointOpt {
    const scriptConfig = this.config.SCRIPTS[configKey];
    if (!scriptConfig) return undefined;
    return { tx_hash: scriptConfig.TX_HASH, index: scriptConfig.INDEX };
  }
}
