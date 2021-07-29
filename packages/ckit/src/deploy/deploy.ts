import fs from 'fs';
import path from 'path';
import { Cell, CellDep, utils } from '@ckb-lumos/base';
import { common } from '@ckb-lumos/common-scripts';
import { ScriptConfig, ScriptConfigs } from '@ckb-lumos/config-manager';
import { key } from '@ckb-lumos/hd';
import {
  minimalCellCapacity,
  parseAddress,
  sealTransaction,
  TransactionSkeleton,
  TransactionSkeletonType,
  generateSecp256k1Blake160Address,
} from '@ckb-lumos/helpers';
import { MercuryProvider } from '../providers/MercuryProvider';
import { bytesToHex, nonNullable } from '../utils';

function calculateCodeHashByBin(scriptBin: Buffer): string {
  const bin = scriptBin.valueOf();
  return new utils.CKBHasher().update(bin.buffer.slice(bin.byteOffset, bin.byteLength + bin.byteOffset)).digestHex();
}

async function loadSecp256k1Script(provider: MercuryProvider): Promise<ScriptConfig> {
  const genesisBlock = await provider.rpc.get_block_by_number('0x0');

  if (!genesisBlock) throw new Error('cannot load genesis block');

  const secp256k1DepTxHash = nonNullable(genesisBlock.transactions[1]).hash;
  const typeScript = nonNullable(nonNullable(genesisBlock.transactions[0]).outputs[1]).type;

  if (!secp256k1DepTxHash) throw new Error('Cannot load secp256k1 transaction');
  if (!typeScript) throw new Error('cannot load secp256k1 type script');

  const secp256k1TypeHash = utils.computeScriptHash(typeScript);

  return {
    HASH_TYPE: 'type',
    CODE_HASH: secp256k1TypeHash,
    INDEX: '0x0',
    TX_HASH: secp256k1DepTxHash,
    DEP_TYPE: 'dep_group',
  };
}

async function deployScripts(
  provider: MercuryProvider,
  scriptBins: Array<Buffer>,
  privateKey: string,
): Promise<ScriptConfigs> {
  let txSkeleton = TransactionSkeleton({ cellProvider: provider });

  const secp256k1ScriptConfig = await loadSecp256k1Script(provider);
  const secp256k1Dep = <CellDep>{
    out_point: {
      tx_hash: secp256k1ScriptConfig.TX_HASH,
      index: secp256k1ScriptConfig.INDEX,
    },
    dep_type: secp256k1ScriptConfig.DEP_TYPE,
  };

  const fromAddress = generateSecp256k1Blake160Address(key.privateKeyToBlake160(privateKey));
  const fromLockscript = parseAddress(fromAddress);
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
  const txHash = await SignAndSendTransaction(provider, txSkeleton, privateKey);

  return {
    SECP256K1_BLAKE160: secp256k1ScriptConfig,
    SUDT: {
      CODE_HASH: calculateCodeHashByBin(nonNullable(scriptBins[0])),
      HASH_TYPE: 'data',
      TX_HASH: txHash,
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    ANYONE_CAN_PAY: {
      CODE_HASH: calculateCodeHashByBin(nonNullable(scriptBins[1])),
      HASH_TYPE: 'data',
      TX_HASH: txHash,
      INDEX: '0x1',
      DEP_TYPE: 'code',
    },
    PW_ANYONE_CAN_PAY: {
      CODE_HASH: calculateCodeHashByBin(nonNullable(scriptBins[2])),
      HASH_TYPE: 'data',
      TX_HASH: txHash,
      INDEX: '0x2',
      DEP_TYPE: 'code',
    },
    PW_NON_ANYONE_CAN_PAY: {
      CODE_HASH: calculateCodeHashByBin(nonNullable(scriptBins[3])),
      HASH_TYPE: 'data',
      TX_HASH: txHash,
      INDEX: '0x3',
      DEP_TYPE: 'code',
    },
  };
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

export async function deployCkbScripts(
  scriptPath: string,
  ckbRpcUrl: string,
  mercuryUrl: string,
  ckbPrivateKey: string,
): Promise<ScriptConfigs> {
  const PATH_SUDT_DEP = path.join(scriptPath, 'sudt');
  const PATH_ACP_DEP = path.join(scriptPath, 'anyone_can_pay');
  const PATH_PW_ACP_DEP = path.join(scriptPath, 'pw_anyone_can_pay');
  const PATH_PW_NON_ACP_DEP = path.join(scriptPath, 'pw_non_anyone_can_pay');

  const sudtBin = fs.readFileSync(PATH_SUDT_DEP);
  const acpBin = fs.readFileSync(PATH_ACP_DEP);
  const pwAcpBin = fs.readFileSync(PATH_PW_ACP_DEP);
  const pwNonAcpBin = fs.readFileSync(PATH_PW_NON_ACP_DEP);

  const provider = new MercuryProvider(mercuryUrl, ckbRpcUrl);
  return deployScripts(provider, [sudtBin, acpBin, pwAcpBin, pwNonAcpBin], ckbPrivateKey);
}
