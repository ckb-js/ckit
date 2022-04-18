import { OutPoint, utils } from '@ckb-lumos/base';
import { ScriptConfig } from '@ckb-lumos/config-manager/lib';
import { RPC } from '@ckb-lumos/rpc';
import { MercuryClient } from '@ckitjs/mercury-client';

export interface Patchable {
  prototype: {
    setScriptConfigByKey: (configKey: string, config: ScriptConfig) => void;
    build: () => Promise<unknown>;
  };
}

export function patch(
  BuilderConstructor: Patchable,
  originalRcLockOutPoint: OutPoint,
  rpcUrl = 'https://mainnet.ckb.dev/rpc',
  indexerUrl = 'https://mainnet.ckb.dev/indexer',
): void {
  const originalBuild = BuilderConstructor.prototype.build;
  BuilderConstructor.prototype.build = async function build(): Promise<unknown> {
    const rpc = new RPC(rpcUrl);
    const mercuryClient = new MercuryClient(indexerUrl);

    const aliveInfo = await rpc.get_live_cell(originalRcLockOutPoint, false);
    if (aliveInfo.status === 'live') {
      return originalBuild();
    }

    const liveCellTx = await rpc.get_transaction(originalRcLockOutPoint.tx_hash);
    const type = liveCellTx?.transaction.outputs[Number(originalRcLockOutPoint.index)]?.type;
    if (type !== undefined) {
      const { objects: cells } = await mercuryClient.get_cells({
        search_key: { script: type, script_type: 'type' },
      });

      if (cells[0]) {
        const newOutPoint = cells[0].out_point;
        const newConfig: ScriptConfig = {
          TX_HASH: newOutPoint.tx_hash,
          INDEX: newOutPoint.index,
          DEP_TYPE: 'code',
          CODE_HASH: utils.computeScriptHash(type),
          HASH_TYPE: 'type',
        };
        // TODO update cell dep here
        this.setScriptConfigByKey('RC_LOCK', newConfig);
      }
    }

    return originalBuild();
  };
}

// patch(AbstractPwSenderBuilder, { tx_hash: '0x0673466fd1c8257b193ffe1565ae1b236d20d9d0233637955e8616ecd49a9dae', index: '0x4' });
