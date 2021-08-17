/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Cell as LumosCell,
  CellDep as LumosCellDep,
  Script as LumosScript,
  OutPoint as LumosOutPoint,
} from '@ckb-lumos/base';
import { ResolvedOutpoint } from '@ckit/base';
import {
  Amount,
  Cell as PwCell,
  CellDep as PwCellDep,
  DepType as PwDepType,
  HashType,
  OutPoint as PwOutPoint,
  Script as PwScript,
} from '@lay2/pw-core';

function fromPwCellDep(x: PwCellDep): LumosCellDep {
  return {
    dep_type: x.depType,
    out_point: {
      tx_hash: x.outPoint.txHash,
      index: x.outPoint.index,
    },
  };
}

function toPwCellDep(x: LumosCellDep): PwCellDep {
  return new PwCellDep(
    x.dep_type === 'dep_group' ? PwDepType.depGroup : PwDepType.code,
    new PwOutPoint(x.out_point.tx_hash, x.out_point.index),
  );
}

function fromPwScript(x: PwScript): LumosScript {
  return {
    code_hash: x.codeHash,
    args: x.args,
    hash_type: x.hashType,
  };
}

function toPwScript(x: LumosScript): PwScript {
  return new PwScript(x.code_hash, x.args, x.hash_type === 'type' ? HashType.type : HashType.data);
}

function fromPwCell(x: PwCell): LumosCell {
  return {
    cell_output: {
      capacity: x.capacity.toHexString(),
      type: x.type ? fromPwScript(x.type) : undefined,
      lock: fromPwScript(x.lock),
    },
    out_point: x.outPoint ? { tx_hash: x.outPoint.txHash, index: x.outPoint.index } : undefined,
    data: x.getData(),
  };
}

function isLumosCell(x: unknown): x is LumosCell {
  if (typeof x !== 'object' || x == null) return false;
  return 'cell_output' in x;
}

function toPwCell(x: LumosCell | ResolvedOutpoint): PwCell {
  if (isLumosCell(x)) {
    return new PwCell(
      new Amount(x.cell_output.capacity, 0),
      toPwScript(x.cell_output.lock),
      x.cell_output.type ? toPwScript(x.cell_output.type) : undefined,
      x.out_point ? new PwOutPoint(x.out_point.tx_hash, x.out_point.index) : undefined,
      x.data,
    );
  }

  return new PwCell(
    new Amount(x.output.capacity, 0),
    toPwScript(x.output.lock),
    x.output.type ? toPwScript(x.output.type) : undefined,
    x.out_point ? new PwOutPoint(x.out_point.tx_hash, x.out_point.index) : undefined,
    x.output_data,
  );
}

function toPwOutPoint(x: LumosOutPoint): PwOutPoint {
  return new PwOutPoint(x.tx_hash, x.index);
}

/**
 * from: PW => Lumos
 * to: Lumos => PW
 */
export const Pw = {
  fromPwCellDep,
  toPwCellDep,
  fromPwCell,
  toPwCell,
  toPwScript,
  fromPwScript,
  toPwOutPoint,
};

export { serialize, deserialize } from './pw.serde';
