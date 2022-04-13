import { Script } from '@ckb-lumos/base';
import { MercuryClient } from './../../mercury-client/src/index';
import { ProviderConfig, OutPointOpt, PromisableOutPointOpt } from '.';

export interface CellOutPointProvider {
  getOutPointByType(type: Script): PromisableOutPointOpt;
}

abstract class BaseCellOutPointProvider implements CellOutPointProvider {
  readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract getOutPointByType(type: Script): PromisableOutPointOpt;
}

export class LatestOutPointProvider extends BaseCellOutPointProvider {
  readonly mercuryClient: MercuryClient;

  constructor(config: ProviderConfig, indexerUrl = 'http://127.0.0.1:8116') {
    super(config);
    this.mercuryClient = new MercuryClient(indexerUrl);
  }

  async getOutPointByType(type: Script): Promise<OutPointOpt> {
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
  getOutPointByType(script: Script): OutPointOpt {
    const futureScripts = this.config.FUTURE_SCRIPTS;
    if (!futureScripts) return undefined;
    const scriptConfigs = Object.values(this.config.SCRIPTS);
    const index = scriptConfigs.findIndex(
      (scriptConfig) => scriptConfig?.CODE_HASH === script.code_hash && scriptConfig?.HASH_TYPE === script.hash_type,
    );
    const found = futureScripts[index];
    if (!found) return undefined;
    return { tx_hash: found.TX_HASH, index: found.INDEX };
  }
}
