import { Address, Cell, ChainInfo, Hash, HexNumber, Script, Transaction, TxPoolInfo } from '@ckb-lumos/base';
import { RPC } from '@ckb-lumos/rpc';
import { AbstractProvider, CkbTypeScript, ResolvedOutpoint } from '@ckitjs/base';
import { MercuryClient, SearchKey } from '@ckitjs/mercury-client';
import { toBigUInt128LE } from '@lay2/pw-core';
import { BigNumber } from 'bignumber.js';
import { concatMap, expand, filter, from, lastValueFrom, reduce, scan, takeWhile } from 'rxjs';
import { NoEnoughCkbError, NoEnoughUdtError } from '../../errors';
import { Amount, BN } from '../../helpers';
import { asyncSleep } from '../../utils';
import { MercuryCellProvider } from './IndexerCellProvider';

type CellsAccumulator = {
  cells: ResolvedOutpoint[];
  amount: BigNumber;
};

function toCell(resolved: ResolvedOutpoint): Cell {
  return {
    cell_output: resolved.output,
    data: resolved.output_data,
    block_number: resolved.block_number,
    out_point: resolved.out_point,
  };
}

interface BatchRequest {
  method: string;
  params: unknown;
}

export class MercuryProvider extends AbstractProvider {
  readonly mercury: MercuryClient;
  readonly rpc: RPC;
  readonly rpcUrl: string;

  constructor(mercuryRpc = 'http://127.0.0.1:8116', ckbRpc = 'http://127.0.0.1:8114') {
    super();

    this.mercury = new MercuryClient(mercuryRpc);
    this.rpc = new RPC(ckbRpc);
    this.rpcUrl = ckbRpc;
  }

  async batchRequestCkb<T>(request: BatchRequest[]): Promise<T[]> {
    const batch = [];
    for (let i = 0; i < request.length; i++) {
      batch.push({
        id: i,
        jsonrpc: '2.0',
        method: request[i]!.method,
        params: [request[i]!.params],
      });
    }
    const res = await fetch(this.rpcUrl, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });

    return await res.json();
  }

  /**
   * @deprecated please migrate to {@link collectLockOnlyCells}
   * @param address
   * @param minimalCapacity
   * @returns
   */
  override async collectCkbLiveCells(address: Address, minimalCapacity: HexNumber): Promise<ResolvedOutpoint[]> {
    const lock = this.parseToScript(address);
    const searchKey: SearchKey = {
      script: lock,
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
          amount: BN(acc.amount).plus(BN(next.output.capacity)),
        }),
        { amount: BN(0), cells: [] } as CellsAccumulator,
      ),
      takeWhile((acc) => BN(acc.amount).lt(BN(minimalCapacity)), true),
    );

    const acc = await lastValueFrom<CellsAccumulator, CellsAccumulator>(cells$, {
      defaultValue: { amount: BN(0), cells: [] },
    });

    if (acc.amount.lt(BN(minimalCapacity))) {
      throw new NoEnoughCkbError({ lock, expected: minimalCapacity, actual: Amount.from(acc.amount).toHex() });
    }

    return acc.cells;
  }

  override async collectLockOnlyCells(lock: Address | Script, capacity: HexNumber): Promise<Cell[]> {
    const result = await this.collectCkbLiveCells(
      typeof lock === 'string' ? lock : this.parseToAddress(lock),
      capacity,
    );

    return result.map((resolved) => ({
      cell_output: resolved.output,
      data: resolved.output_data,
      block_number: resolved.block_number,
      out_point: resolved.out_point,
    }));
  }

  collectCells({ searchKey }: { searchKey: SearchKey }, takeWhile_: (cell: Cell[]) => boolean): Promise<Cell[]> {
    const cells$ = from(this.mercury.get_cells({ search_key: searchKey })).pipe(
      expand((res) => this.mercury.get_cells({ search_key: searchKey, after_cursor: res.last_cursor }), 1),
      takeWhile((res) => res.objects.length > 0),
      concatMap((res) => res.objects.map(toCell)),
      scan((acc, next) => acc.concat(next), [] as Cell[]),
      takeWhile((acc) => takeWhile_(acc)),
    );

    return lastValueFrom(cells$, { defaultValue: [] });
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
      reduce((balance, cell) => balance.plus(BN(cell.output.capacity)), BN(0)),
    );

    const balance = await lastValueFrom(balance$, { defaultValue: BN(0) });
    return '0x' + balance.toString(16);
  }

  override getTxPoolInfo(): Promise<TxPoolInfo> {
    return this.rpc.tx_pool_info();
  }

  override getChainInfo(): Promise<ChainInfo> {
    return this.rpc.get_blockchain_info();
  }

  override sendTransaction(tx: Transaction): Promise<Hash> {
    return this.rpc.send_transaction(tx, 'passthrough');
  }

  async collectUdtCells(address: Address, udt: CkbTypeScript, minimalAmount: HexNumber): Promise<ResolvedOutpoint[]> {
    const lock = this.parseToScript(address);
    const searchKey: SearchKey = { script: lock, filter: { script: udt }, script_type: 'lock' };

    const cells$ = from(this.mercury.get_cells({ search_key: searchKey })).pipe(
      expand((res) => this.mercury.get_cells({ search_key: searchKey, after_cursor: res.last_cursor }), 1),
      takeWhile((res) => res.objects.length > 0),
      concatMap((res) => res.objects),
      scan(
        (acc, resolvedCell) => ({
          cells: acc.cells.concat(resolvedCell),
          amount: BN(acc.amount).plus(BN(toBigUInt128LE(resolvedCell.output_data.slice(0, 34)))),
        }),
        { amount: BN(0), cells: [] } as CellsAccumulator,
      ),
      takeWhile((acc) => BN(acc.amount).lt(minimalAmount), true), // inclusive last to ensure cells are enough
    );

    const acc = await lastValueFrom<CellsAccumulator, CellsAccumulator>(cells$, {
      defaultValue: { amount: BN(0), cells: [] },
    });

    if (BN(acc.amount).lt(minimalAmount)) {
      throw new NoEnoughUdtError({ lock, expected: minimalAmount, actual: Amount.from(acc.amount).toHex() });
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
      reduce((acc, resolvedCell) => BN(acc).plus(toBigUInt128LE(resolvedCell.output_data.slice(0, 34))), BN(0)),
    );

    return lastValueFrom(balance$, { defaultValue: BN(0) }).then((x) => '0x' + x.toString(16));
  }

  async waitForTransactionCommitted(
    txHash: string,
    options: { pollIntervalMs?: number; timeoutMs?: number } = {},
  ): Promise<Transaction | null> {
    const { pollIntervalMs = 1000, timeoutMs = 120000 } = options;
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
