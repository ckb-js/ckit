import { utils } from '@ckb-lumos/base';
import { formatByteLike } from '@ckitjs/easy-byte/dist';
import { SerializeUdtInfo, RcSupplyOutputData } from '@ckitjs/rc-lock';
import { bytes, invariant } from '@ckitjs/utils';
import { Amount, Cell, RawTransaction, Transaction } from '@lay2/pw-core';
import { Reader } from 'ckb-js-toolkit';
import { CkbAmount } from '../../helpers';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { byteLenOfRcCell } from '../builder-utils';
import { AbstractPwSenderBuilder } from '../pw/AbstractPwSenderBuilder';
import { CreateRcUdtInfoCellOptions } from './CreateRcUdtInfoCellBuilder';

export class CreateRcUdtInfoCellPwBuilder extends AbstractPwSenderBuilder {
  constructor(private options: CreateRcUdtInfoCellOptions, protected provider: CkitProvider) {
    super(provider);
  }

  async build(): Promise<Transaction> {
    const { sudtInfo, rcIdentity } = this.options;
    const provider = this.provider;

    const udtInfo = SerializeUdtInfo({
      name: Reader.fromRawString(sudtInfo.name).toArrayBuffer(),
      symbol: Reader.fromRawString(sudtInfo.symbol).toArrayBuffer(),
      decimals: sudtInfo.decimals,
      description: Reader.fromRawString(sudtInfo.description).toArrayBuffer(),
    });

    const rcUdtInfoCellSize = byteLenOfRcCell(
      21 /*rc identity*/ + 1 /*rc flag*/ + 32 /*typeid script hash*/,
      32,
      1 /*version*/ +
        16 /*current supply*/ +
        16 /*max supply*/ +
        32 /* sudt script hash*/ +
        udtInfo.byteLength /*udt info molecule table*/,
    );

    const ownerRcLock = provider.newScript('RC_LOCK', bytes.concat(rcIdentity.flag, rcIdentity.pubkeyHash, 0));
    const ownerRcAddress = provider.parseToAddress(ownerRcLock);

    const senderOutpoints = await provider.collectCkbLiveCells(
      ownerRcAddress,
      CkbAmount.fromCkb(
        byteLenOfRcCell(21 /*rc identity*/ + 1 /*rc flag*/, 0, 0) + // owner live cell
          rcUdtInfoCellSize + // udt cell
          1, // tx fee
      ).toHex(),
    );

    invariant(senderOutpoints[0]);

    const typeIdScript = Pw.toPwScript(
      provider.generateTypeIdScript({ previous_output: senderOutpoints[0].out_point, since: '0x0' }, '0x0'),
    );

    const rcLockScript = Pw.toPwScript(
      provider.newScript(
        'RC_LOCK',
        bytes.concat(rcIdentity.flag, rcIdentity.pubkeyHash, '08' /*supply flag: 0b100*/, typeIdScript.toHash()),
      ),
    );
    const rcInfoCell = new Cell(
      new Amount(String(rcUdtInfoCellSize), 8),
      rcLockScript,
      typeIdScript,
      undefined,
      bytes.concat(
        formatByteLike(
          RcSupplyOutputData.encode({
            version: 0,
            current_supply: 0n,
            max_supply: BigInt(sudtInfo.maxSupply),
            sudt_script_hash: utils.computeScriptHash(provider.newSudtScript(Pw.fromPwScript(rcLockScript))),
          }),
        ),
        formatByteLike(new Uint8Array(udtInfo)),
      ),
    );

    const senderCells = senderOutpoints.map(Pw.toPwCell);
    const senderOutput = senderCells[0];

    invariant(senderOutput);

    senderOutput.capacity = senderCells.reduce((acc, next) => acc.add(next.capacity), new Amount('0'));

    const rawTransaction = new RawTransaction(
      senderCells,
      [rcInfoCell, senderOutput],
      this.getCellDepsByCells(senderCells, [rcInfoCell, senderOutput]),
    );
    const tx: Transaction = new Transaction(rawTransaction, [
      this.getWitnessPlaceholder(provider.parseToAddress(provider.newScript('RC_LOCK'))),
    ]);

    const fee = CreateRcUdtInfoCellPwBuilder.calcFee(tx);
    senderOutput.capacity = senderOutput.capacity.sub(new Amount(String(rcUdtInfoCellSize), 8)).sub(fee);

    return tx;
  }
}
