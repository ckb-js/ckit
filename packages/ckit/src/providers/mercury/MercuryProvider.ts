import { Address, ChainInfo, Hash, HexNumber, Transaction } from '@ckb-lumos/base';
import { RPC } from '@ckb-lumos/rpc';
import { AbstractProvider, CkbTypeScript, ResolvedOutpoint } from '@ckit/base';
import { MercuryClient, SearchKey } from '@ckit/mercury-client';
import { toBigUInt128LE } from '@lay2/pw-core';
import { concatMap, expand, filter, firstValueFrom, from, reduce, scan, takeWhile } from 'rxjs';
import { asyncSleep } from '../../utils';
import { MercuryCellProvider } from './IndexerCellProvider';

type CellsAccumulator = {
  cells: ResolvedOutpoint[];
  amount: bigint;
};

export class MercuryProvider extends AbstractProvider {
  readonly mercury: MercuryClient;
  readonly rpc: RPC;

  constructor(
    mercuryRpc: MercuryClient | string = 'http://127.0.0.1:8116',
    ckbRpc: RPC | string = 'http://127.0.0.1:8114',
  ) {
    super();

    if (mercuryRpc instanceof MercuryClient) this.mercury = mercuryRpc;
    else this.mercury = new MercuryClient(mercuryRpc);

    if (ckbRpc instanceof RPC) this.rpc = ckbRpc;
    else this.rpc = new RPC(ckbRpc);
  }

  override async collectCkbLiveCells(address: Address, minimalCapacity: HexNumber): Promise<ResolvedOutpoint[]> {
    const searchKey: SearchKey = {
      script: this.parseToScript(address),
      script_type: 'lock',
      filter: { output_data_len_range: ['0x0', '0x1'] }, // ckb live cells only
    };

    const cells$ = from(this.mercury.get_cells({ search_key: searchKey })).pipe(
      expand((res) => this.mercury.get_cells({ search_key: searchKey, after_cursor: res.last_cursor }), 1),
      takeWhile((res) => res.objects.length > 0),
      concatMap((res) => res.objects),
      filter((cell) => cell.output.type == null), // live cell only
      scan(
        (acc, next) => ({
          cells: acc.cells.concat(next),
          amount: acc.amount + BigInt(next.output.capacity),
        }),
        { amount: 0n, cells: [] } as CellsAccumulator,
      ),
      takeWhile((acc) => acc.amount < BigInt(minimalCapacity), true),
    );

    const acc = await firstValueFrom(cells$, { defaultValue: { amount: 0n, cells: [] } });

    if (acc.amount < BigInt(minimalCapacity)) {
      throw new Error(
        `The live cell is not enough, expected minimal amount: ${minimalCapacity}, actual: ${acc.amount}`,
      );
    }

    return acc.cells;
  }

  /**
   * Calculate the capacity of all cells with only locks
   */
  async getCkbLiveCellsBalance(address: Address): Promise<HexNumber> {
    const searchKey: SearchKey = {
      script: this.parseToScript(address),
      script_type: 'lock',
      filter: { output_data_len_range: ['0x0', '0x1'] }, // ckb live cells only
    };

    const balance$ = from(this.mercury.get_cells({ search_key: searchKey })).pipe(
      expand((res) => this.mercury.get_cells({ search_key: searchKey, after_cursor: res.last_cursor }), 1),
      takeWhile((res) => res.objects.length > 0),
      concatMap((res) => res.objects),
      filter((cell) => cell.output.type == null),
      reduce((balance, cell) => balance + BigInt(cell.output.capacity), 0n),
    );

    const balance = await firstValueFrom(balance$, { defaultValue: '0x0' });
    return String(balance);
  }

  override getChainInfo(): Promise<ChainInfo> {
    return this.rpc.get_blockchain_info();
  }

  override sendTransaction(tx: Transaction): Promise<Hash> {
    return this.rpc.send_transaction(tx);
  }

  async collectUdtCells(address: Address, udt: CkbTypeScript, minimalAmount: HexNumber): Promise<ResolvedOutpoint[]> {
    const searchKey: SearchKey = {
      script: this.parseToScript(address),
      filter: { script: udt },
      script_type: 'lock',
    };

    const cells$ = from(this.mercury.get_cells({ search_key: searchKey })).pipe(
      expand((res) => this.mercury.get_cells({ search_key: searchKey, after_cursor: res.last_cursor }), 1),
      takeWhile((res) => res.objects.length > 0),
      concatMap((res) => res.objects),
      scan(
        (acc, resolvedCell) => ({
          cells: acc.cells.concat(resolvedCell),
          amount: acc.amount + BigInt(toBigUInt128LE(resolvedCell.output_data.slice(0, 34))),
        }),
        { amount: 0n, cells: [] } as CellsAccumulator,
      ),
      takeWhile((acc) => acc.amount < BigInt(minimalAmount), true),
    );

    const acc = await firstValueFrom(cells$, { defaultValue: { amount: 0n, cells: [] } });

    if (acc.amount < BigInt(minimalAmount)) {
      throw new Error(`The udt cell is not enough, expected minimal amount: ${minimalAmount}, actual: ${acc.amount}`);
    }

    return acc.cells;
  }

  getUdtBalance(address: Address, udt: CkbTypeScript): Promise<HexNumber> {
    const searchKey: SearchKey = {
      script: this.parseToScript(address),
      filter: { script: udt },
      script_type: 'lock',
    };

    const balance$ = from(this.mercury.get_cells({ search_key: searchKey })).pipe(
      expand((res) => this.mercury.get_cells({ search_key: searchKey, after_cursor: res.last_cursor }), 1),
      takeWhile((res) => res.objects.length > 0),
      concatMap((res) => res.objects),
      reduce((acc, resolvedCell) => acc + BigInt(toBigUInt128LE(resolvedCell.output_data.slice(0, 34))), 0n),
    );

    return firstValueFrom(balance$, { defaultValue: 0n }).then((x) => String(x));
  }

  async waitForTransactionCommitted(
    txHash: string,
    options: { pollIntervalMs?: number; timeoutMs?: number } = {},
  ): Promise<Transaction | null> {
    const { pollIntervalMs = 1000, timeoutMs = 60000 } = options;
    const start = Date.now();

    let result: Transaction | null = null;

    while (Date.now() - start <= timeoutMs) {
      const tx = await this.rpc.get_transaction(txHash);
      if (tx?.tx_status?.status === 'committed') {
        result = tx.transaction;
        break;
      }

      await asyncSleep(pollIntervalMs);
    }

    const rpcTip = Number(await this.rpc.get_tip_block_number());

    while (Date.now() - start <= timeoutMs) {
      const mercuryTip = await this.mercury.get_tip();
      if (Number(mercuryTip.block_number) >= rpcTip) break;

      await asyncSleep(pollIntervalMs);
    }

    return result;
  }

  asIndexerCellProvider(): MercuryCellProvider {
    return new MercuryCellProvider(this.mercury);
  }
}
