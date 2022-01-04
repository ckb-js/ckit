import { Address, utils, since, Cell, Header } from '@ckb-lumos/base';
import { minimalCellCapacity } from '@ckb-lumos/helpers';
import { SearchKey } from '@ckitjs/mercury-client';
import { bytes } from '@ckitjs/utils';
import { Amount, Builder, RawTransaction, Transaction, CellInput } from '@lay2/pw-core';
import { CkbTypeScript, CkitProvider } from '..';
import { BN } from '../helpers';
import { Pw } from '../helpers/pw';
import { nonNullable } from '../utils';
import { byteLenOfHexData, byteLenOfLockOnlyCell, mergeLockOnlyCells } from './builder-utils';
import { AbstractPwSenderBuilder } from './pw/AbstractPwSenderBuilder';

export interface ChequeWithdrawOptions {
  sender: Address;
  receiver: Address;
  sudt?: CkbTypeScript;
}

export class ChequeWithdrawBuilder extends AbstractPwSenderBuilder {
  constructor(private options: ChequeWithdrawOptions, provider: CkitProvider) {
    super(provider);
  }

  async build(): Promise<Transaction> {
    const { sender, receiver, sudt } = this.options;
    const provider = this.provider;

    const senderLock = provider.parseToScript(sender);
    const receiverLock = provider.parseToScript(receiver);

    const searchKey: SearchKey = {
      script: provider.newScript(
        'CHEQUE',
        `0x${utils.computeScriptHash(receiverLock).slice(2, 42)}${utils.computeScriptHash(senderLock).slice(2, 42)}`,
      ),
      ...(sudt ? { filter: { script: sudt } } : {}),
      script_type: 'lock',
    };
    const unwithdrawnCells = await provider.collectCells({ searchKey }, (cells) => cells.length <= 1000);

    const currEpoch = await provider.rpc.get_current_epoch();
    const validEpoch = Number(currEpoch.number) - 6;
    const validWithdrawCells: Cell[] = [];
    const req = [];
    for (const cell of unwithdrawnCells) {
      req.push({ method: 'get_header_by_number', params: cell.block_number });
    }
    const result = await this.provider.batchRequestCkb<Header>(req);
    for (let i = 0; i < result.length; i++) {
      const epoch = Number('0x' + nonNullable(result[i]).epoch.substring(9));
      if (epoch < validEpoch) validWithdrawCells.push(nonNullable(unwithdrawnCells[i]));
    }
    if (validWithdrawCells.length === 0) throw new Error('No valid cheque to withdraw');

    let withdrawnChangeCapacity = BN(0);
    let extraNeededCapacity = BN(0);
    const withdrawnSudtCells = validWithdrawCells.map(function (cell) {
      const sudtCell = { ...cell, cell_output: { ...cell.cell_output, lock: senderLock } };
      const sudtCapacity = bytes.toHex(minimalCellCapacity(sudtCell));

      withdrawnChangeCapacity = withdrawnChangeCapacity.plus(BN(cell.cell_output.capacity).minus(sudtCapacity));

      return { ...cell, cell_output: { ...cell.cell_output, lock: senderLock, capacity: sudtCapacity } };
    });
    const withdrawnChangeCell: Cell = {
      data: '0x',
      cell_output: {
        capacity: '0x0',
        lock: senderLock,
        type: undefined,
      },
    };
    const minimalCapacity = minimalCellCapacity(withdrawnChangeCell);
    if (withdrawnChangeCapacity.toNumber() < minimalCapacity) {
      withdrawnChangeCell.cell_output.capacity = bytes.toHex(minimalCapacity);
      extraNeededCapacity = extraNeededCapacity.plus(BN(minimalCapacity).minus(withdrawnChangeCapacity));
    } else {
      withdrawnChangeCell.cell_output.capacity = bytes.toHex(withdrawnChangeCapacity);
    }

    const inputCapacityCells = await provider.collectLockOnlyCells(
      senderLock,
      new Amount(bytes.toHex(extraNeededCapacity), 0)
        .add(new Amount('1'))
        .add(new Amount(byteLenOfLockOnlyCell(byteLenOfHexData(receiverLock.args)).toString()))
        .toHexString(),
    );

    const changeCell = Pw.toPwCell(mergeLockOnlyCells(inputCapacityCells));

    const inputSince = since.generateSince({
      relative: true,
      type: 'epochNumber',
      value: {
        number: 6,
        length: 0,
        index: 0,
      },
    });

    const rawTx = new RawTransaction(
      [...inputCapacityCells.map(Pw.toPwCell), ...validWithdrawCells.map(Pw.toPwCell)],
      [...withdrawnSudtCells.map(Pw.toPwCell), Pw.toPwCell(withdrawnChangeCell), changeCell],

      this.getCellDepsByCells(
        [...inputCapacityCells.map(Pw.toPwCell), ...validWithdrawCells.map(Pw.toPwCell)],
        [...withdrawnSudtCells.map(Pw.toPwCell), Pw.toPwCell(withdrawnChangeCell), changeCell],
      ),
    );
    rawTx.inputs = rawTx.inputCells.map<CellInput>(function (cell) {
      const cellInput = nonNullable(cell.toCellInput());
      const script = {
        code_hash: cell.lock.codeHash,
        hash_type: cell.lock.hashType,
        args: cell.lock.args,
      };
      if (provider.isTemplateOf('CHEQUE', script)) {
        return new CellInput(cellInput.previousOutput, inputSince);
      } else {
        return new CellInput(cellInput.previousOutput, '0x0');
      }
    });

    const tx = new Transaction(rawTx, [this.getWitnessPlaceholder(sender)]);

    const fee = Builder.calcFee(tx, Number(provider.config.MIN_FEE_RATE));
    changeCell.capacity = changeCell.capacity.sub(fee).sub(new Amount(bytes.toHex(extraNeededCapacity), 0));

    return tx;
  }
}
