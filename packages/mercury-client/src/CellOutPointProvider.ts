import { OutPoint } from '@ckb-lumos/base';
import { RPC } from '@ckb-lumos/rpc';
import { ProviderConfig, OutPointOpt, PromisableOutPointOpt, CellOutPointProvider } from '@ckitjs/base';
import { MercuryClient } from '.';

abstract class BaseCellOutPointProvider implements CellOutPointProvider {
  readonly config: ProviderConfig;
  readonly rpc: RPC;
  readonly rpcUrl: string;

  constructor(config: ProviderConfig, rpcUrl: string) {
    this.config = config;
    this.rpcUrl = rpcUrl;
    this.rpc = new RPC(rpcUrl);
  }

  abstract getOutPointByType(originalOutPoint: OutPoint): PromisableOutPointOpt;
}

export class LatestOutPointProvider extends BaseCellOutPointProvider {
  readonly mercuryClient: MercuryClient;

  constructor(config: ProviderConfig, rpcUrl = 'http://127.0.0.1:8114', indexerUrl = 'http://127.0.0.1:8116') {
    super(config, rpcUrl);
    this.mercuryClient = new MercuryClient(indexerUrl);
  }

  async getOutPointByType(originalOutPoint: OutPoint): Promise<OutPointOpt> {
    const depCellStatus = await this.rpc.get_live_cell(originalOutPoint, false);
    if (depCellStatus.status === 'live') {
      return originalOutPoint;
    }
    const type = depCellStatus.cell?.output.type;
    if (!type) return undefined;

    const { objects: cells } = await this.mercuryClient.get_cells({
      search_key: { script: type, script_type: 'type' },
    });
    if (cells[0]) {
      return cells[0].out_point;
    }
    return undefined;
  }
}

export class StaticFutureOutPointProvider extends BaseCellOutPointProvider {
  async getOutPointByType(originalOutPoint: OutPoint): Promise<OutPointOpt> {
    const depCellStatus = await this.rpc.get_live_cell(originalOutPoint, false);
    if (depCellStatus.status === 'live') {
      return originalOutPoint;
    }
    const type = depCellStatus.cell?.output.type;
    if (!type) return undefined;

    const futureScripts = this.config.FUTURE_SCRIPTS;
    if (!futureScripts) return undefined;
    const scriptConfigs = Object.values(this.config.SCRIPTS);
    const index = scriptConfigs.findIndex(
      (scriptConfig) => scriptConfig?.CODE_HASH === type.code_hash && scriptConfig?.HASH_TYPE === type.hash_type,
    );
    const found = futureScripts[index];
    if (!found) return undefined;
    return { tx_hash: found.TX_HASH, index: found.INDEX };
  }
}
