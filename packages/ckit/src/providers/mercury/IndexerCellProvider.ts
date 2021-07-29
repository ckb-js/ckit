import { CellCollector, CellCollectorResults, CellProvider, QueryOptions, Script } from '@ckb-lumos/base';
import { MercuryClient, SearchKey } from '@ckit/mercury-client';

export class MercuryCellProvider implements CellProvider {
  constructor(private mercury: MercuryClient) {}

  collector(queries: QueryOptions): CellCollector {
    const { lock, type } = queries;
    let searchKey: SearchKey;
    if (lock !== undefined) {
      searchKey = { script: lock as Script, script_type: 'lock' };
      if (type != undefined && type !== 'empty') {
        searchKey.filter = { script: type as Script };
      }
    } else {
      if (type != undefined && type != 'empty') {
        searchKey = { script: type as Script, script_type: 'type' };
      } else {
        throw new Error(`should specify either type or lock in queries, queries now: ${JSON.stringify(queries)}`);
      }
    }
    const queryData = queries.data || '0x';
    const mercury = this.mercury;

    return {
      collect(): CellCollectorResults {
        return {
          async *[Symbol.asyncIterator]() {
            const sizeLimit = 100;
            for (;;) {
              const res = await mercury.get_cells({ search_key: searchKey });
              const liveCells = res.objects;
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
