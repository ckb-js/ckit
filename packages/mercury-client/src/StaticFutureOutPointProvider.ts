import { utils } from '@ckb-lumos/base';
import { OutPointOpt } from '@ckitjs/base';
import { BaseCellOutPointProvider } from '.';

export class StaticFutureOutPointProvider extends BaseCellOutPointProvider {
  async getScriptDep(configKey: string): Promise<OutPointOpt> {
    const { shouldReturnOriginalOutput, originalOutPoint } = await this.checkConfigByKey(configKey);
    if (shouldReturnOriginalOutput) return originalOutPoint;

    const type = await this.getTypeIdByOutPoint(originalOutPoint);
    const futureScripts = {
      RC_LOCK: {
        CODE_HASH: '0xb91e81f5f817e901c4a3bca9e108417dbcc2e34ebf720d24327a1a97a3e22ad8',
        HASH_TYPE: 'type',
        TX_HASH: 'FUTURE_RC_LOCK_TX_HASH',
        INDEX: '0x1',
        DEP_TYPE: 'code',
      },
    };
    const scriptConfigs = Object.values(futureScripts);
    const index = scriptConfigs.findIndex(
      (scriptConfig) =>
        scriptConfig?.CODE_HASH === utils.computeScriptHash(type) && scriptConfig?.HASH_TYPE === type.hash_type,
    );
    const found = scriptConfigs[index];
    if (!found) return undefined;
    return { tx_hash: found.TX_HASH, index: found.INDEX };
  }
}
