# RC lock

[RC lock](https://github.com/XuJiandong/docs-bank/blob/bfcb80c8c5c09931c4e59aad8eca2f6be06b32a5/omni_lock.md) ([Source Code](https://github.com/nervosnetwork/ckb-production-scripts/tree/09f37ee525e566a050d252cdb1020e345a57bef7)) is a new lock script that is designed to be used together with [Regulation Compliance Extension](https://talk.nervos.org/t/rfc-regulation-compliance-extension/5338)

- Lina

| parameter   | value                                                                |
| ----------- | -------------------------------------------------------------------- |
| `code_hash` | `0x9f3aeaf2fc439549cbc870c653374943af96a0658bd6b51be8d8983183e6f52f` |
| `hash_type` | `type`                                                               |
| `tx_hash`   | `0x56ca53b2a733cc0725a656a433572d8f76d37051b1f2322a9e9d49f39e219c3f` |
| `index`     | `0x0`                                                                |
| `dep_type`  | `code`                                                               |

- Aggron

| parameter   | value                                                                |
| ----------- | -------------------------------------------------------------------- |
| `code_hash` | `0x79f90bb5e892d80dd213439eeab551120eb417678824f282b4ffb5f21bad2e1e` |
| `hash_type` | `type`                                                               |
| `tx_hash`   | `0xe563433a510dfae33252eeef81246e94a6638cdb13ff1a3dc3ac7ab8868b6b26` |
| `index`     | `0x0`                                                                |
| `dep_type`  | `code`                                                               |

## Verification

```sh
git clone https://github.com/nervosnetwork/ckb-production-scripts.git
cd ckb-production-scripts
git checkout -b rc_lock 09f37ee525e566a050d252cdb1020e345a57bef7
git submodule update --init --recursive
make all-via-docker
```

```js
const fs = require('fs');
const { utils } = require('@ckb-lumos/base');
const { RPC } = require('@ckb-lumos/rpc');
const { Reader } = require('ckb-js-toolkit');

// const RPC_URL = 'https://testnet.ckb.dev/rpc';
// const TX_HASH = '0xe563433a510dfae33252eeef81246e94a6638cdb13ff1a3dc3ac7ab8868b6b26';
const RPC_URL = 'https://mainnet.ckb.dev/rpc';
const TX_HASH = '0x56ca53b2a733cc0725a656a433572d8f76d37051b1f2322a9e9d49f39e219c3f';
const OUTPUT_INDEX = 0;
const BINARY_PATH = '/path/to/build/rc_lock';


function calculateCodeHashByBin(scriptBin /*: Buffer*/) /*: string*/ {
  const bin = scriptBin.valueOf();
  return new utils.CKBHasher().update(bin.buffer.slice(bin.byteOffset, bin.byteLength + bin.byteOffset)).digestHex();
}

async function getDataHash(txHash /*: string*/, index /*: number*/) {
  const rpc = new RPC(RPC_URL);

  const tx = await rpc.get_transaction(txHash);

  if (!tx) throw new Error(`TxHash(${txHash}) is not found`);

  const outputData = tx.transaction.outputs_data[index];
  if (!outputData) throw new Error(`cannot find output data`);

  return new utils.CKBHasher().update(new Reader(outputData)).digestHex();
}

async function validate() {
  const localHash = calculateCodeHashByBin(fs.readFileSync(BINARY_PATH));
  const onChainHash = await getDataHash(TX_HASH, OUTPUT_INDEX);

  console.log('local hash is', localHash);
  console.log('on-chain hash is', onChainHash);
}

validate();
```

```
local hash is 0x1bf147d1c95a5ad51016bd426c33f364257e685af54df26fc69ec40e3ae267d1
on-chain hash is 0x1bf147d1c95a5ad51016bd426c33f364257e685af54df26fc69ec40e3ae267d1
```
