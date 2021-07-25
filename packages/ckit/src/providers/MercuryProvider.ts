import { Address, ChainInfo, Hash, HexNumber, Transaction } from '@ckb-lumos/base';
import { RPC } from '@ckb-lumos/rpc';
import { MercuryClient } from '@ckit/mercury-client';
import { AbstractProvider, CkbTypeScript, ResolvedOutpoint } from '../interfaces';
import { asyncSleep, unimplemented } from '../utils';

export class MercuryProvider extends AbstractProvider {
  mercury: MercuryClient;
  rpc: RPC;

  constructor(mercuryUri = 'http://127.0.0.1:8116', ckbRpcUri = 'http://127.0.0.1:8114') {
    super();
    this.mercury = new MercuryClient(mercuryUri);
    this.rpc = new RPC(ckbRpcUri);
  }

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

  async waitForTransactionCommitted(
    txHash: string,
    options: { pollIntervalMs?: number; timeoutMs?: number } = {},
  ): Promise<Transaction | null> {
    const { pollIntervalMs = 3_000, timeoutMs = 60_000 } = options;
    const start = Date.now();

    while (Date.now() - start <= timeoutMs) {
      const tx = await this.rpc.get_transaction(txHash);
      if (tx?.tx_status?.status === 'committed') return tx.transaction;

      await asyncSleep(pollIntervalMs);
    }

    return null;
  }
}
