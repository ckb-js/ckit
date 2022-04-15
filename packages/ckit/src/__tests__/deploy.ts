import fs from 'fs';
import path from 'path';
import { Cell, CellProvider, Script, utils, CellCollector, QueryOptions } from '@ckb-lumos/base';
import { Indexer as CkbIndexer } from '@ckb-lumos/ckb-indexer';
import { common, deploy } from '@ckb-lumos/common-scripts';
import { ScriptConfig } from '@ckb-lumos/config-manager';
import { key } from '@ckb-lumos/hd';
import {
  minimalCellCapacity,
  parseAddress,
  sealTransaction,
  TransactionSkeleton,
  TransactionSkeletonType,
  generateSecp256k1Blake160Address,
} from '@ckb-lumos/helpers';
import { CkitConfigKeys } from '@ckitjs/ckit';
import { debug } from '@ckitjs/utils';
import { predefined } from '../predefined';
import { CkitConfig, CkitProvider } from '../providers';
import { bytesToHex, nonNullable } from '../utils';

function calculateCodeHashByBin(scriptBin: Buffer): string {
  const bin = scriptBin.valueOf();
  return new utils.CKBHasher().update(bin.buffer.slice(bin.byteOffset, bin.byteLength + bin.byteOffset)).digestHex();
}

export async function loadSecp256k1ScriptDep(provider: CkitProvider): Promise<ScriptConfig> {
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

export async function deployWithTypeId(
  provider: CkitProvider,
  scriptBin: Buffer,
  privateKey: string,
): Promise<ScriptConfig> {
  let txSkeleton = TransactionSkeleton({ cellProvider: provider.asIndexerCellProvider() });
  const secp256k1Config = await loadSecp256k1ScriptDep(provider);
  const fromAddress = generateSecp256k1Blake160Address(key.privateKeyToBlake160(privateKey));
  const fromLockscript = parseAddress(fromAddress);
  const indexer = new CkbIndexer(provider.mercuryUrl, provider.rpcUrl);
  const deployOptions = {
    cellProvider: indexer as CellProvider,
    scriptBinary: scriptBin,
    fromInfo: fromAddress,
  };
  const deployment = await deploy.generateDeployWithTypeIdTx(deployOptions);
  const output: Cell = {
    cell_output: {
      capacity: '0x0',
      lock: fromLockscript,
      type: deployment.typeId,
    },
    data: bytesToHex(scriptBin),
  };
  const cellCapacity = minimalCellCapacity(output);
  output.cell_output.capacity = `0x${cellCapacity.toString(16)}`;
  txSkeleton = txSkeleton.update('outputs', (outputs) => {
    return outputs.push(output);
  });

  txSkeleton = await completeTx(txSkeleton, fromAddress);

  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.clear();
  });
  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.push({
      out_point: { tx_hash: secp256k1Config.TX_HASH, index: secp256k1Config.INDEX },
      dep_type: secp256k1Config.DEP_TYPE,
    });
  });

  const txHash = await signAndSendTransaction(provider, txSkeleton, privateKey);

  return {
    HASH_TYPE: 'type',
    DEP_TYPE: 'code',
    INDEX: '0x0',
    TX_HASH: txHash,
    CODE_HASH: utils.computeScriptHash(deployment.typeId),
  };
}

class PureCkbCellProvider implements CellProvider {
  readonly indexer;
  constructor(indexerUrl: string, rpcUrl: string) {
    this.indexer = new CkbIndexer(indexerUrl, rpcUrl);
  }
  collector(queryOptions: QueryOptions): CellCollector {
    return this.indexer.collector({ ...queryOptions, outputDataLenRange: ['0x0', '0x1'] });
  }
}
export async function upgradeScriptWithTypeId(
  provider: CkitProvider,
  scriptBin: Buffer,
  privateKey: string,
  typeId: Script,
): Promise<ScriptConfig> {
  const secp256k1Config = await loadSecp256k1ScriptDep(provider);
  const fromAddress = generateSecp256k1Blake160Address(key.privateKeyToBlake160(privateKey));
  const fromLockscript = parseAddress(fromAddress);
  const indexer = new CkbIndexer(provider.mercuryUrl, provider.rpcUrl);
  const deployOptions = {
    cellProvider: indexer,
    scriptBinary: scriptBin,
    fromInfo: fromAddress,
    typeId,
  };
  const deployment = await deploy.generateUpgradeTypeIdDataTx(deployOptions);
  const output: Cell = {
    cell_output: {
      capacity: '0x0',
      lock: fromLockscript,
      type: typeId,
    },
    data: bytesToHex(scriptBin),
  };
  const cellCapacity = minimalCellCapacity(output);
  output.cell_output.capacity = `0x${cellCapacity.toString(16)}`;
  let txSkeleton = deployment.txSkeleton;

  txSkeleton.update('cellProvider', (_) => {
    return new PureCkbCellProvider(provider.mercuryUrl, provider.rpcUrl);
  });

  for (let index = 0; index < txSkeleton.inputs.size; index++) {
    debug('upgradeScriptWithTypeId before completeTx', txSkeleton.inputs.get(index));
  }
  txSkeleton = await completeTxWithOutPayFee(txSkeleton, fromAddress);
  for (let index = 0; index < txSkeleton.inputs.size; index++) {
    debug('upgradeScriptWithTypeId after completeTx', txSkeleton.inputs.get(index));
  }
  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.clear();
  });
  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.push({
      out_point: { tx_hash: secp256k1Config.TX_HASH, index: secp256k1Config.INDEX },
      dep_type: secp256k1Config.DEP_TYPE,
    });
  });

  for (let index = 0; index < txSkeleton.get('inputs').size; index++) {
    debug('upgradeScriptWithTypeId tx skelenton inputs are %o', txSkeleton.get('inputs').get(index)?.out_point);
  }

  const txHash = await signAndSendTransaction(provider, txSkeleton, privateKey);

  return {
    HASH_TYPE: 'type',
    DEP_TYPE: 'code',
    INDEX: '0x0',
    TX_HASH: txHash,
    CODE_HASH: utils.computeScriptHash(typeId),
  };
}

async function deployScripts(
  provider: CkitProvider,
  scriptBins: Array<Buffer>,
  upgradableSriptBins: Array<Buffer>,
  privateKey: string,
): Promise<CkitConfig['SCRIPTS']> {
  let txSkeleton = TransactionSkeleton({ cellProvider: provider.asIndexerCellProvider() });

  const secp256k1Config = await loadSecp256k1ScriptDep(provider);

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

  const rcLock = await deployWithTypeId(provider, upgradableSriptBins[0] as Buffer, privateKey);

  txSkeleton = await completeTx(txSkeleton, fromAddress);
  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.clear();
  });
  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.push({
      out_point: { tx_hash: secp256k1Config.TX_HASH, index: secp256k1Config.INDEX },
      dep_type: secp256k1Config.DEP_TYPE,
    });
  });

  const txHash = await signAndSendTransaction(provider, txSkeleton, privateKey);

  return {
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
    CHEQUE: {
      CODE_HASH: calculateCodeHashByBin(nonNullable(scriptBins[4])),
      HASH_TYPE: 'data',
      TX_HASH: txHash,
      INDEX: '0x4',
      DEP_TYPE: 'code',
    },
    RC_LOCK: rcLock,

    SECP256K1_BLAKE160: secp256k1Config,

    // TODO refactor needed, split it into the deploy script and predefined script
    UNIPASS: predefined.Aggron.SCRIPTS.UNIPASS,
  };
}
async function completeTx(
  txSkeleton: TransactionSkeletonType,
  fromAddress: string,
  feeRate = BigInt(10000),
): Promise<TransactionSkeletonType> {
  txSkeleton = await completeTxWithOutPayFee(txSkeleton, fromAddress);
  await common.payFeeByFeeRate(txSkeleton, [fromAddress], feeRate);
  return txSkeleton;
}

async function completeTxWithOutPayFee(
  txSkeleton: TransactionSkeletonType,
  fromAddress: string,
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
  return txSkeleton;
}

async function signAndSendTransaction(
  provider: CkitProvider,
  txSkeleton: TransactionSkeletonType,
  privateKey: string,
): Promise<string> {
  txSkeleton = common.prepareSigningEntries(txSkeleton);
  const message = nonNullable(txSkeleton.get('signingEntries').get(0)).message;
  const Sig = key.signRecoverable(message, privateKey);
  const tx = sealTransaction(txSkeleton, [Sig]);
  const hash = await provider.sendTransaction(tx);
  await provider.waitForTransactionCommitted(hash);
  return hash;
}

export async function deployCkbScripts(
  scriptPath: string,
  provider: CkitProvider,
  ckbPrivateKey: string,
): Promise<CkitConfig['SCRIPTS']> {
  const PATH_SUDT_DEP = path.join(scriptPath, 'sudt');
  const PATH_ACP_DEP = path.join(scriptPath, 'anyone_can_pay');
  const PATH_PW_ACP_DEP = path.join(scriptPath, 'pw_anyone_can_pay');
  const PATH_PW_NON_ACP_DEP = path.join(scriptPath, 'pw_non_anyone_can_pay');
  const RC_DEP = path.join(scriptPath, 'rc_lock');
  const CHEQUE_DEP = path.join(scriptPath, 'cheque');

  const sudtBin = fs.readFileSync(PATH_SUDT_DEP);
  const acpBin = fs.readFileSync(PATH_ACP_DEP);
  const pwAcpBin = fs.readFileSync(PATH_PW_ACP_DEP);
  const pwNonAcpBin = fs.readFileSync(PATH_PW_NON_ACP_DEP);
  const rcBin = fs.readFileSync(RC_DEP);
  const chequeBin = fs.readFileSync(CHEQUE_DEP);

  return deployScripts(provider, [sudtBin, acpBin, pwAcpBin, pwNonAcpBin, chequeBin], [rcBin], ckbPrivateKey);
}

export async function upgradeScript(
  scriptPath: string,
  scriptConfigName: CkitConfigKeys,
  provider: CkitProvider,
  ckbPrivateKey: string,
): Promise<ScriptConfig> {
  const scriptBin = fs.readFileSync(scriptPath);
  const scriptConfig = provider.config.SCRIPTS[scriptConfigName];
  const liveCell = await provider.rpc.get_live_cell(
    { tx_hash: scriptConfig.TX_HASH, index: scriptConfig.INDEX },
    false,
  );

  if (liveCell.status === 'live') {
    const typeId = liveCell.cell?.output.type;
    if (typeId === undefined) throw new Error("Upgrade fail, Can't get typeId of the original script");
    return await upgradeScriptWithTypeId(provider, scriptBin, ckbPrivateKey, typeId);
  } else {
    const liveCellTx = await provider.rpc.get_transaction(scriptConfig.TX_HASH);
    if (liveCellTx === null) throw new Error("Upgrade fail, Can't get transaction of the original script");
    const typeId = liveCellTx.transaction.outputs[Number(scriptConfig.INDEX)]?.type;
    if (typeId === undefined) throw new Error("Upgrade fail, Can't get typeId of the original script");
    return await upgradeScriptWithTypeId(provider, scriptBin, ckbPrivateKey, typeId);
  }
}
