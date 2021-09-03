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

export function byteLenOfCkbLiveCell(lockArgsByteLen = 20): number {
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
