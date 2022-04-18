import { Cell, ChainInfo, Hash, TxPoolInfo } from '@ckb-lumos/base';
import { unimplemented } from '@ckitjs/utils';
import { ResolvedOutpoint } from '..';
import { AbstractProvider } from '../AbstractProvider';

export class DummyProvider extends AbstractProvider {
  collectCkbLiveCells(): Promise<ResolvedOutpoint[]> {
    unimplemented();
  }

  collectLockOnlyCells(): Promise<Cell[]> {
    unimplemented();
  }

  getChainInfo(): Promise<ChainInfo> {
    unimplemented();
  }

  getTxPoolInfo(): Promise<TxPoolInfo> {
    unimplemented();
  }

  sendTransaction(): Promise<Hash> {
    unimplemented();
  }
}
