import { Cell, ChainInfo, Hash, TxPoolInfo } from '@ckb-lumos/base';
import { unimplemented } from '@ckitjs/utils';
import { CellOutPointProvider, ResolvedOutpoint } from '..';
import { AbstractProvider } from '../AbstractProvider';

export class DummyProvider extends AbstractProvider {
  depOutPointProvider: CellOutPointProvider;
  upgradableContracts: string[];

  constructor() {
    super();
    this.depOutPointProvider = null as unknown as CellOutPointProvider;
    this.upgradableContracts = [''];
  }

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
