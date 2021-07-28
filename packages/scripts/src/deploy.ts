import fs from 'fs';
import path from 'path';
import { Cell, CellDep } from '@ckb-lumos/base';
import { common } from '@ckb-lumos/common-scripts';
import { key } from '@ckb-lumos/hd';
import {
  minimalCellCapacity,
  parseAddress,
  sealTransaction,
  TransactionSkeleton,
  TransactionSkeletonType,
  generateSecp256k1Blake160Address,
} from '@ckb-lumos/helpers';
import { MercuryProvider } from 'ckit/dist/providers/MercuryProvider';
import { nonNullable } from 'ckit/dist/utils';
import { bytesToHex, pathFromProjectRoot } from './index';

async function loadSecp256k1ScriptDep(provider: MercuryProvider): Promise<CellDep> {
  const genesisBlock = await provider.rpc.get_block_by_number('0x0');

  if (!genesisBlock) throw new Error('cannot load genesis block');

  //   let secp256k1DepTxHash;
  //   if (genesisBlock.transactions[1]) {
  //     secp256k1DepTxHash = genesisBlock.transactions[1]?.hash;
  //   }
  const secp256k1DepTxHash = nonNullable(genesisBlock.transactions[1]).hash;
  const typeScript = nonNullable(nonNullable(genesisBlock.transactions[0]).outputs[1]).type;

  if (!secp256k1DepTxHash) throw new Error('Cannot load secp256k1 transaction');
  if (!typeScript) throw new Error('cannot load secp256k1 type script');

  return {
    out_point: {
      tx_hash: secp256k1DepTxHash,
      index: '0x0',
    },
    dep_type: 'dep_group',
  };
}

async function deployScripts(provider: MercuryProvider, scriptBins: Array<Buffer>, privateKey: string) {
  let txSkeleton = TransactionSkeleton({ cellProvider: provider });

  const secp256k1Dep = await loadSecp256k1ScriptDep(provider);
  console.log('secp256k1', secp256k1Dep);
  // get from cells
  const fromAddress = generateSecp256k1Blake160Address(key.privateKeyToBlake160(privateKey));
  const fromLockscript = parseAddress(fromAddress);
  // add output
  for (const scriptBin of scriptBins) {
    const output: Cell = {
      cell_output: {
        capacity: '0x0',
        lock: fromLockscript,
      },
      data: bytesToHex(scriptBin),
    };
    const cellCapacity = minimalCellCapacity(output);
    output.cell_output.capacity = `0x${cellCapacity.toString(16)}`;
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      return outputs.push(output);
    });
  }

  txSkeleton = await completeTx(txSkeleton, fromAddress);
  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.clear();
  });
  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.push(secp256k1Dep);
  });
  const hash = await SignAndSendTransaction(provider, txSkeleton, privateKey);
  console.log('deploy hash', hash);
  //const sudtCodeHash = bytesToHex(blake2b(sudtBin));
  //   return {
  //     cellDep: {
  //       depType: 'code',
  //       outPoint: {
  //         txHash: hash,
  //         index: '0x0',
  //       },
  //     },
  //     script: {
  //       codeHash: sudtCodeHash,
  //       hashType: 'data',
  //     },
  //   };
}

async function completeTx(
  txSkeleton: TransactionSkeletonType,
  fromAddress: string,
  feeRate = BigInt(10000),
): Promise<TransactionSkeletonType> {
  const inputCapacity = txSkeleton
    .get('inputs')
    .map((c) => BigInt(c.cell_output.capacity))
    .reduce((a, b) => a + b, BigInt(0));
  const outputCapacity = txSkeleton
    .get('outputs')
    .map((c) => BigInt(c.cell_output.capacity))
    .reduce((a, b) => a + b, BigInt(0));
  const needCapacity = outputCapacity - inputCapacity + BigInt(10) ** BigInt(8);
  txSkeleton = await common.injectCapacity(txSkeleton, [fromAddress], needCapacity, undefined, undefined, {
    enableDeductCapacity: false,
  });
  txSkeleton = await common.payFeeByFeeRate(txSkeleton, [fromAddress], feeRate);
  return txSkeleton;
}

async function SignAndSendTransaction(
  provider: MercuryProvider,
  txSkeleton: TransactionSkeletonType,
  privateKey: string,
): Promise<string> {
  txSkeleton = common.prepareSigningEntries(txSkeleton);
  const message = txSkeleton.get('signingEntries').get(0)!.message;
  const Sig = key.signRecoverable(message!, privateKey);
  const tx = sealTransaction(txSkeleton, [Sig]);
  const hash = await provider.sendTransaction(tx);
  await provider.waitForTransactionCommitted(hash);
  return hash;
}

async function deployCkbScripts(
  scriptPath: string,
  ckbRpcUrl: string,
  mercuryUrl: string,
  ckbPrivateKey: string,
  //cachePath?: string,
) {
  const PATH_SUDT_DEP = path.join(scriptPath, 'sudt');
  const PATH_ACP_DEP = path.join(scriptPath, 'anyone_can_pay');
  const PATH_PW_ACP_DEP = path.join(scriptPath, 'pw_anyone_can_pay');
  const PATH_PW_NON_ACP_DEP = path.join(scriptPath, 'pw_non_anyone_can_pay');

  const sudtBin = fs.readFileSync(PATH_SUDT_DEP);
  const acpBin = fs.readFileSync(PATH_ACP_DEP);
  const pwAcpBin = fs.readFileSync(PATH_PW_ACP_DEP);
  const pwNonAcpBin = fs.readFileSync(PATH_PW_NON_ACP_DEP);

  const provider = new MercuryProvider(mercuryUrl, ckbRpcUrl);
  await deployScripts(provider, [sudtBin], ckbPrivateKey);

  //   if (cachePath) {
  //     writeJsonToFile(data, cachePath);
  //   }
  //   return data;
}

async function main() {
  const scriptPath = pathFromProjectRoot('/deps/build');
  console.log('script path', scriptPath);
  const ckbRpcUrl = 'http://127.0.0.1:8114';
  const mercuryUrl = 'http://127.0.0.1:8116';
  const ckbPrivateKey = '0xa800c82df5461756ae99b5c6677d019c98cc98c7786b80d7b2e77256e46ea1fe';

  await deployCkbScripts(scriptPath, ckbRpcUrl, mercuryUrl, ckbPrivateKey);
}

main().catch((e) => {
  console.log('deploy error', e);
  process.exit(1);
});
