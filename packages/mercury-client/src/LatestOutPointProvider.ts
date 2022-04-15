import { ProviderConfig, OutPointOpt } from '@ckitjs/base';
import { BaseCellOutPointProvider, MercuryClient } from '.';

export class LatestOutPointProvider extends BaseCellOutPointProvider {
  readonly mercuryClient: MercuryClient;

  constructor(config: ProviderConfig, rpcUrl = 'http://127.0.0.1:8114', indexerUrl = 'http://127.0.0.1:8116') {
    super(config, rpcUrl);
    this.mercuryClient = new MercuryClient(indexerUrl);
  }

  async getScriptDep(configKey: string): Promise<OutPointOpt> {
    const { shouldReturnOriginalOutput, originalOutPoint } = await this.checkConfigByKey(configKey);
    if (shouldReturnOriginalOutput) return originalOutPoint;
    const type = await this.getTypeIdByOutPoint(originalOutPoint);

    const { objects: cells } = await this.mercuryClient.get_cells({
      search_key: { script: type, script_type: 'type' },
    });

    if (cells[0]) {
      return cells[0].out_point;
    }
    return undefined;
  }
}
