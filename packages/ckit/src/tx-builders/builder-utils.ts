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
