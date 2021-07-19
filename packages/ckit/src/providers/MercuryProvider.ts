import { ChainInfo, Hash, HexNumber, OutPoint, Transaction } from '@ckb-lumos/base';
import { AddressLike, Provider } from '../interfaces';
import { unimplemented } from '../utils';

export class MercuryProvider implements Provider {
  collectCkbLiveCell(_lock: AddressLike, _capacity: HexNumber): Promise<OutPoint[]> {
    unimplemented();
  }

  getChainInfo(): Promise<ChainInfo> {
    unimplemented();
  }

  sendTransaction(_tx: Transaction): Promise<Hash> {
    unimplemented();
  }

  collectSudtCell(_lock: AddressLike, _amount: HexNumber): Promise<OutPoint[]> {
    unimplemented();
  }

  getUdtBalance(_lock: AddressLike, _udt: AddressLike): Promise<HexNumber> {
    unimplemented();
  }

  getBlockNumber(): Promise<HexNumber> {
    unimplemented();
  }
}
