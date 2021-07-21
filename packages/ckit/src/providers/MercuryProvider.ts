import { Address, ChainInfo, Hash, HexNumber, Transaction } from '@ckb-lumos/base';
import { AbstractProvider, CkbTypeScript, ResolvedOutpoint } from '../interfaces';
import { unimplemented } from '../utils';

export class MercuryProvider extends AbstractProvider {
  collectCkbLiveCell(_lock: Address, _capacity: HexNumber): Promise<ResolvedOutpoint[]> {
    unimplemented();
  }

  getChainInfo(): Promise<ChainInfo> {
    unimplemented();
  }

  sendTransaction(_tx: Transaction): Promise<Hash> {
    unimplemented();
  }

  collectSudtCell(_lock: Address, _amount: HexNumber): Promise<ResolvedOutpoint[]> {
    unimplemented();
  }

  getUdtBalance(_lock: Address, _udt: CkbTypeScript): Promise<HexNumber> {
    unimplemented();
  }

  getBlockNumber(): Promise<HexNumber> {
    unimplemented();
  }
}
