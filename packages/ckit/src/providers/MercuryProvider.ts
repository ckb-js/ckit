import { ChainInfo, Hash, HexNumber, Transaction } from '@ckb-lumos/base';
import { AddressLike, Provider, ResolvedOutpoint } from '../interfaces';
import { unimplemented } from '../utils';

export class MercuryProvider implements Provider {
  collectCkbLiveCell(_lock: AddressLike, _capacity: HexNumber): Promise<ResolvedOutpoint[]> {
    unimplemented();
  }

  getChainInfo(): Promise<ChainInfo> {
    unimplemented();
  }

  sendTransaction(_tx: Transaction): Promise<Hash> {
    unimplemented();
  }

  collectSudtCell(_lock: AddressLike, _amount: HexNumber): Promise<ResolvedOutpoint[]> {
    unimplemented();
  }

  getUdtBalance(_lock: AddressLike, _udt: AddressLike): Promise<HexNumber> {
    unimplemented();
  }

  getBlockNumber(): Promise<HexNumber> {
    unimplemented();
  }
}
