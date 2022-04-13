import { OutPoint, Script } from '@ckb-lumos/base';
import { Indexer } from '@ckb-lumos/ckb-indexer';
import { ProviderConfig } from './ProviderTypes';

export interface CellOutPointProvider {
  getOutPointByType(type: Script): Promise<OutPoint | undefined>;
}

abstract class BaseCellOutPointProvider implements CellOutPointProvider {
  readonly indexer;
  readonly indexerUrl: string;
  readonly config: ProviderConfig;

  constructor(ckbRpc = 'http://127.0.0.1:8114', indexerUrl = 'http://127.0.0.1:8116', config: ProviderConfig) {
    this.indexer = new Indexer(indexerUrl, ckbRpc);
    this.indexerUrl = indexerUrl;
    this.config = config;
  }

  abstract getOutPointByType(type: Script): Promise<OutPoint | undefined>;
}

export class AutoCellOutPointProvider extends BaseCellOutPointProvider {
  async getOutPointByType(type: Script): Promise<OutPoint | undefined> {
    const { objects: cells } = await this.indexer.getCells({ script: type, script_type: 'type' });
    if (cells[0]) {
      return cells[0].out_point;
    }
    return undefined;
  }
}

export class KnownCellOutPointProvider extends BaseCellOutPointProvider {
  async getOutPointByType(script: Script): Promise<OutPoint | undefined> {
    const scriptConfigs = Object.values(this.config.SCRIPTS);
    const index = scriptConfigs.findIndex(
      (scriptConfig) => scriptConfig?.CODE_HASH === script.code_hash && scriptConfig?.HASH_TYPE === script.hash_type,
    );
    const found = scriptConfigs[index];
    if (!found) return undefined;
    return { tx_hash: found.TX_HASH, index: found.INDEX };
  }
}
