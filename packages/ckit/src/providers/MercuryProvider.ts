import {
  Address,
  ChainInfo,
  Hash,
  HexNumber,
  Tip,
  Transaction,
  QueryOptions,
  Indexer,
  CellCollector,
  CellCollectorResults,
  Script,
  Hexadecimal,
} from '@ckb-lumos/base';
import { RPC } from '@ckb-lumos/rpc';
import { AbstractProvider, CkbTypeScript, ResolvedOutpoint } from '@ckit/base';
import { MercuryClient } from '@ckit/mercury-client';
import { asyncSleep, unimplemented } from '../utils';

export enum ScriptType {
  type = 'type',
  lock = 'lock',
}

export enum Order {
  asc = 'asc',
  desc = 'desc',
}

export type HexadecimalRange = [Hexadecimal, Hexadecimal];

export interface SearchKey {
  script: Script;
  script_type: ScriptType;
  filter?: {
    script?: Script;
    output_data_len_range?: HexadecimalRange;
    output_capacity_range?: HexadecimalRange;
    block_range?: HexadecimalRange;
  };
}

export class MercuryProvider extends AbstractProvider implements Indexer {
  uri: string;
  mercury: MercuryClient;
  rpc: RPC;

  constructor(
    mercuryRpc: MercuryClient | string = 'http://127.0.0.1:8116',
    ckbRpc: RPC | string = 'http://127.0.0.1:8114',
  ) {
    super();

    //Todo fill uri
    this.uri = '';

    if (mercuryRpc instanceof MercuryClient) this.mercury = mercuryRpc;
    else this.mercury = new MercuryClient(mercuryRpc);

    if (ckbRpc instanceof RPC) this.rpc = ckbRpc;
    else this.rpc = new RPC(ckbRpc);
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

  // Indexer inplements

  async tip(): Promise<Tip> {
    return this.mercury.get_tip();
  }

  running(): boolean {
    return true;
  }

  start(): void {
    //logger.debug('ckb indexer start');
  }

  startForever(): void {
    //logger.debug('ckb indexer startForever');
  }

  stop(): void {
    //logger.debug('ckb indexer stop');
  }

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  subscribe(queries: QueryOptions): NodeJS.EventEmitter {
    unimplemented();
  }

  subscribeMedianTime(): NodeJS.EventEmitter {
    unimplemented();
  }

  async waitForSync(blockDifference = 0): Promise<void> {
    const rpcTipNumber = parseInt((await this.rpc.get_tip_header()).number, 16);
    for (;;) {
      const indexerTipNumber = parseInt((await this.tip()).block_number, 16);
      if (indexerTipNumber + blockDifference >= rpcTipNumber) {
        return;
      }
      await asyncSleep(1000);
    }
  }
  /*
   * Addtional note:
   * Only accept lock and type parameters as `Script` type, along with `data` field in QueryOptions. Use it carefully!
   * * */
  collector(queries: QueryOptions): CellCollector {
    const { lock, type } = queries;
    let searchKey: SearchKey;
    if (lock !== undefined) {
      searchKey = {
        script: lock as Script,
        script_type: ScriptType.lock,
      };
      if (type != undefined && type !== 'empty') {
        searchKey.filter = {
          script: type as Script,
        };
      }
    } else {
      if (type != undefined && type != 'empty') {
        searchKey = {
          script: type as Script,
          script_type: ScriptType.type,
        };
      } else {
        throw new Error(
          `should specify either type or lock in queries, queries now: ${JSON.stringify(queries, null, 2)}`,
        );
      }
    }
    const queryData = queries.data || '0x';
    const get_cells = this.mercury.get_cells;
    return {
      collect(): CellCollectorResults {
        return {
          async *[Symbol.asyncIterator]() {
            const order = 'asc';
            const sizeLimit = 100;
            let cursor = null;
            for (;;) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const params: any = [searchKey, order, `0x${sizeLimit.toString(16)}`, cursor];
              const res = await get_cells(params);
              const liveCells = res.objects;
              cursor = res.last_cursor;
              for (const cell of liveCells) {
                if (queryData === 'any' || queryData === cell.output_data) {
                  yield {
                    cell_output: cell.output,
                    data: cell.output_data,
                    out_point: cell.out_point,
                    block_number: cell.block_number,
                  };
                }
              }
              if (liveCells.length < sizeLimit) {
                break;
              }
            }
          },
        };
      },
    };
  }
}
