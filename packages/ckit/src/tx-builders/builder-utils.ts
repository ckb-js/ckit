import { Cell, HexNumber, HexString, Script, utils } from '@ckb-lumos/base';
import { minimalCellCapacity } from '@ckb-lumos/helpers';
import { bytes } from '@ckitjs/utils';
import { BigNumber, BN } from '../helpers';

export function byteLenOfSudt(lockArgsByteLen = 20): number {
  return (
    8 /* capacity: u64 */ +
    /* lock script */
    32 /* code_hash: U256 */ +
    lockArgsByteLen +
    1 /* hash_type: u8 */ +
    /* type script */
    32 /* code_hash: U256 */ +
    32 /* args: U256, issuer lock hash */ +
    1 /* hash_type: u8 */ +
    /* output_data */
    16 /* data: u128, amount, little-endian */
  );
}

export function byteLenOfLockOnlyCell(lockArgsByteLen = 20): number {
  // prettier-ignore
  return (
    8 /* capacity: u64 */ +
    32 /* code_hash: U256 */ +
    lockArgsByteLen +
    1 /* hash_type: u8 */
  )
}

/**
 *  * Data:
 *  - <1 byte version>
 *  - <16 bytes current supply>
 *  - <16 bytes max supply>
 *  - <32 bytes sUDT script hash>
 *  - info: molecule table
 *  - name: bytes
 *  - symbol: bytes
 *  - decimals: u32
 *  - description: bytes
 * Type: <Info Cell type ID>
 * Lock: <RC Lock Script 1>
 *  code_hash: RC Lock
 *  args: <flag: 1> <Eth pubkey hash> <RC lock flags: 8> <Info Cell Type Script Hash>
 * ```
 */
export function byteLenOfRcCell(lockArgsByteLen: number, typeArgsByteLen: number, dataLen: number): number {
  const typeScriptLen = typeArgsByteLen
    ? 32 /* code_hash: U256 */ + typeArgsByteLen /* args: U256, issuer lock hash */ + 1 /* hash_type: u8 */
    : 0;

  // prettier-ignore
  return (
    8 /*capacity: u64*/ +
    /* lock script */
    32 /* code_hash: U256 */ +
    lockArgsByteLen +
    1 /* hash_type: u8 */ +
    /* type script */
    typeScriptLen +
    /* output_data */
    dataLen /* data: u128, amount, little-endian */
  );
}

export function byteLenOfChequeCell(dataLen = 16 /* u128 */): number {
  return (
    8 /*capacity: u64*/ +
    /* lock script */
    32 /* code_hash: U256 */ +
    40 /* receiver_lock_hash[:20]+sender_lock_hash[:20] */ +
    1 /* hash_type: u8 */ +
    /* type script */
    32 /* code_hash: U256 */ +
    32 /* issuer lock hash */ +
    1 /* hash_type: u8 */ +
    dataLen
  );
}

export function occupiedShannon(byteLen: number): HexNumber {
  return '0x' + (byteLen * 10 ** 8).toString(16);
}

export function byteLenOfHexData(data: HexString): number {
  return data.startsWith('0x') ? data.slice(2).length / 2 : data.length / 2;
}

// function compose<X1, Y1>(fn1: (x: X1) => Y1): (x: X1) => Y1;
// function compose<X1, Y1, Y2>(fn1: (x: X1) => Y1, fn2: (x: Y1) => Y2): (x: X1) => Y2;
// function compose<X1, Y1, Y2, Y3>(fn1: (x: X1) => Y1, fn2: (x: Y1) => Y2, fn3: (x: Y2) => Y3): (x: X1) => Y3;
// // prettier-ignore
// function compose<X1, Y1, Y2, Y3, Y4>( fn1: (x: X1) => Y1, fn2: (x: Y1) => Y2, fn3: (x: Y2) => Y3, fn4: (x: Y3) => Y4): (x: X1) => Y4;
// export function compose() {

// }

export interface PipeFn {
  <X1, Y1>(fn1: (x: X1) => Y1): (x: X1) => Y1;
  <X1, Y1, Y2>(fn1: (x: X1) => Y1, fn2: (x: Y1) => Y2): (x: X1) => Y2;
  <X1, Y1, Y2, Y3>(fn1: (x: X1) => Y1, fn2: (x: Y1) => Y2, fn3: (x: Y2) => Y3): (x: X1) => Y3;
  <X1, Y1, Y2, Y3, Y4>(fn1: (x: X1) => Y1, fn2: (x: Y1) => Y2, fn3: (x: Y2) => Y3, fn4: (x: Y3) => Y4): (x: X1) => Y4;
  // prettier-ignore
  <X1, Y1, Y2, Y3, Y4, Y5>(fn1: (x: X1) => Y1, fn2: (x: Y1) => Y2, fn3: (x: Y2) => Y3, fn4: (x: Y3) => Y4, fn5: (x: Y4) => Y5): (x: X1) => Y5;
}

export const pipe = ((...fn: ((x: unknown) => unknown)[]) => {
  return fn.reduce((fx, fg) => (arg: unknown) => fg(fx(arg)));
}) as PipeFn;

pipe(
  byteLenOfHexData,
  (num: number): string => num.toString(16),
  (x) => Number(x),
  (x) => x.toFixed(3),
  (x) => x.toUpperCase(),
);

export function toBigUint128LE(x: BigNumber): HexNumber {
  return utils.toBigUInt128LE(BigInt(x.toString()));
}

export function readBigUint128LE(hex: HexNumber): BigNumber {
  return BN(utils.readBigUInt128LE(hex));
}

export function mergeSudtCells({ cells, lock }: { cells: Cell[]; lock: Script }): Cell {
  if (!cells[0]) throw new Error('cells is empty');

  const [capacity, amount] = cells.reduce<[BigNumber, BigNumber]>(
    ([totalCapacity, totalAmount], cell) => {
      return [totalCapacity.plus(cell.cell_output.capacity), totalAmount.plus(readBigUint128LE(cell.data))];
    },
    [BN(0) /* capacity */, BN(0) /* sudt amount */],
  );

  lock = lock || cells[0].cell_output.lock;

  return {
    ...cells[0],
    cell_output: { capacity: bytes.toHex(capacity), lock, type: cells[0].cell_output.type },
    data: toBigUint128LE(amount),
  };
}

export function mergeLockOnlyCells(cells: Cell[]): Cell {
  if (!cells[0]) throw new Error('cells is empty');

  const totalCapacity = cells.reduce<BigNumber>((total, cell) => total.plus(cell.cell_output.capacity), BN(0));

  return {
    ...cells[0],
    cell_output: { ...cells[0].cell_output, capacity: bytes.toHex(totalCapacity) },
  };
}

export function ejectExtraCapacity({ cell, lock }: { cell: Cell; lock: Script }): [Cell, Cell] {
  const refinedCell = { ...cell, cell_output: { ...cell.cell_output, lock } };
  const refinedCapacity = bytes.toHex(minimalCellCapacity(refinedCell));

  return [
    { ...cell, cell_output: { ...cell.cell_output, capacity: refinedCapacity } },
    { data: '0x', cell_output: { capacity: bytes.toHex(BN(cell.cell_output.capacity).minus(refinedCapacity)), lock } },
  ];
}
