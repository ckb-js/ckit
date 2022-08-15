import { Address, Cell, HexNumber, Script } from '@ckb-lumos/base';
import { minimalCellCapacity } from '@ckb-lumos/helpers';
import { CkbTypeScript } from '@ckitjs/base';
import {
  Amount,
  AmountUnit,
  Builder,
  Cell as PwCell,
  RawTransaction,
  Transaction,
  cellOccupiedBytes,
  WitnessArgs,
} from '@lay2/pw-core';
import { SearchKey } from '@ckitjs/mercury-client';
import { BigNumber } from 'bignumber.js';
import { Pw } from '../helpers/pw';
import { CkitProvider } from '../providers';
import { AbstractPwSenderBuilder } from './pw/AbstractPwSenderBuilder';
import { NoEnoughCkbError } from '../errors';

const feeCkb = new Amount('1', AmountUnit.ckb);

export interface ExchangeSudtForCkbOptions {
  sudt: CkbTypeScript;
  sudtSender: Address;
  // exchange sudtAmountForExchange for ckbAmountForRecipient
  sudtAmountForExchange: HexNumber;
  sudtAmountForRecipient: HexNumber;

  exchangeProvider: Cell[] | Address;
  ckbAmountForRecipient: HexNumber;

  // receive the ckbAmountForRecipient + sudtAmountForRecipient
  exchangeRecipient: Address;
}

export class ExchangeSudtForCkbBuilder extends AbstractPwSenderBuilder {
  constructor(private options: ExchangeSudtForCkbOptions, protected provider: CkitProvider) {
    super(provider);
  }

  /*
    inputs
      - exchangeProviderCells
          - capacity: exchangeCkbSum
          - data.amount: exchangeSudtSum
      - sudtCells
          - capacity: sudtCkbSum
          - data.amount: sudtSum
    outputs
      - exchangeProviderCell
          - capacity: exchangeCkbSum - ckbAmountForRecipient - fee
          - data.amount: exchangeSudtSum + sudtAmountForExchange
      - sudtCell
          - capacity: sudtCkbSum
          - data.amount: sudtSum - sudtAmountForExchange - sudtAmountForRecipient
      - recipientCell
          - capacity: ckbAmountForRecipient
          - data.amount: sudtAmountForRecipient
  */
  async build(): Promise<Transaction> {
    const inExchangeProviderCells = await this.collectExchangeProviderCells(this.calcMinExchangeProviderCkb());
    const inSudtCells = await this.collectSudtCells(this.calcNeededSudtAmount());

    const outExchangeCell = this.createOutExchangeCell(inExchangeProviderCells);
    const outSudtCell = this.createOutSudtCell(inSudtCells);
    const outRecipientCell = this.createOutRecipientCell();

    const inputs = [...inExchangeProviderCells, ...inSudtCells];
    const outputs = [outExchangeCell, outSudtCell, outRecipientCell];
    const cellDeps = await this.getCellDepsByCells(inputs, outputs);
    const rawTx = new RawTransaction(inputs, outputs, cellDeps);

    const tx = new Transaction(rawTx, this.createWitness(inExchangeProviderCells, inSudtCells) as WitnessArgs[]);

    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));
    outExchangeCell.capacity = outExchangeCell.capacity.sub(fee);

    this.checkTransaction(tx);

    return tx;
  }

  private async collectSudtCells(neededSudtAmount: Amount) {
    const sudtOutpoints = await this.provider.collectUdtCells(
      this.options.sudtSender,
      this.options.sudt,
      neededSudtAmount.toHexString(),
    );

    const inSudtCells = sudtOutpoints.map(Pw.toPwCell);
    return inSudtCells;
  }

  private async collectExchangeProviderCells(minimalCapacity: Amount): Promise<PwCell[]> {
    let inExchangeProviderCells: PwCell[] = [];
    let lock: Script;
    if (typeof this.options.exchangeProvider === 'string') {
      lock = this.provider.parseToScript(this.options.exchangeProvider);
      const searchKey: SearchKey = {
        script: lock,
        script_type: 'lock',
        filter: {
          script: this.options.sudt,
        },
      };
      const exchangeOutputs = await this.provider.collectCells(
        { searchKey },
        (cells) =>
          cells.reduce((sum, cell) => sum.add(new Amount(cell.cell_output.capacity)), Amount.ZERO).lt(minimalCapacity),
        { inclusive: true },
      );

      inExchangeProviderCells = exchangeOutputs.map(Pw.toPwCell);
    } else {
      lock = this.options.exchangeProvider[0]!.cell_output.lock;
      inExchangeProviderCells = this.options.exchangeProvider.map(Pw.toPwCell);
    }

    const inExchangeProviderCkbSum = inExchangeProviderCells.reduce((sum, cell) => sum.add(cell.capacity), Amount.ZERO);

    if (inExchangeProviderCkbSum.lt(minimalCapacity)) {
      throw new NoEnoughCkbError({
        lock,
        expected: minimalCapacity.toString(),
        actual: inExchangeProviderCkbSum.toString(),
      });
    }

    return inExchangeProviderCells;
  }

  private createOutExchangeCell(inExchangeProviderCells: PwCell[]): PwCell {
    const outExchangeCell = inExchangeProviderCells[0]!.clone();

    const [inExchangeProviderCkbSum, inExchangeProviderSudtSum] = this.calcCkbAndSudtSum(inExchangeProviderCells);

    const ckbAmountForRecipient = new Amount(
      new BigNumber(this.options.ckbAmountForRecipient).toString(),
      AmountUnit.shannon,
    );
    outExchangeCell.capacity = inExchangeProviderCkbSum.sub(ckbAmountForRecipient);

    const sudtAmountForExchange = new Amount(
      new BigNumber(this.options.sudtAmountForExchange).toString(),
      AmountUnit.shannon,
    );
    outExchangeCell.setSUDTAmount(inExchangeProviderSudtSum.add(sudtAmountForExchange));

    return outExchangeCell;
  }

  private createOutSudtCell(inSudtCells: PwCell[]) {
    const outSudtCell = inSudtCells[0]!.clone();
    const inSudtSum = inSudtCells.reduce((sum, cell) => sum.add(cell.getSUDTAmount()), Amount.ZERO);
    outSudtCell.setSUDTAmount(inSudtSum.sub(this.calcNeededSudtAmount()));
    return outSudtCell;
  }

  private createOutRecipientCell(): PwCell {
    const ckbAmountForRecipient = new Amount(
      new BigNumber(this.options.ckbAmountForRecipient).toString(),
      AmountUnit.shannon,
    );

    const outRecipientCell = new PwCell(
      ckbAmountForRecipient,
      Pw.toPwScript(this.provider.parseToScript(this.options.exchangeRecipient)),
      Pw.toPwScript(this.options.sudt),
    );

    const sudtAmountForRecipient = new Amount(
      new BigNumber(this.options.sudtAmountForRecipient).toString(),
      AmountUnit.shannon,
    );
    outRecipientCell.setSUDTAmount(sudtAmountForRecipient);

    return outRecipientCell;
  }

  private createWitness(firstInputs: PwCell[], secondInputs: PwCell[]): WitnessArgs[] {
    const witness: WitnessArgs[] = [];
    if (typeof this.options.exchangeProvider === 'string') {
      firstInputs.map(() => witness.push(this.getWitnessPlaceholder(this.options.exchangeProvider as Address)));
    } else {
      const cell = this.options.exchangeProvider![0] as Cell;
      firstInputs.map(() =>
        witness.push(this.getWitnessPlaceholder(this.provider.parseToAddress(cell.cell_output.lock))),
      );
    }
    secondInputs.map(() => witness.push(this.getWitnessPlaceholder(this.options.sudtSender as Address)));
    return witness;
  }

  private calcMinExchangeProviderCkb() {
    let lock: Script;
    if (typeof this.options.exchangeProvider === 'string') {
      lock = this.provider.parseToScript(this.options.exchangeProvider as string);
    } else {
      const cell = this.options.exchangeProvider[0]! as Cell;
      lock = cell.cell_output.lock;
    }

    const exchangeProviderCell = {
      cell_output: {
        capacity: '0x0',
        lock: lock,
        type: this.options.sudt,
      },
      data: new Amount('0').toUInt128LE(),
    };

    const ckbAmountForRecipient = new Amount(
      new BigNumber(this.options.ckbAmountForRecipient).toString(),
      AmountUnit.shannon,
    );
    const ckbAmount = ckbAmountForRecipient.add(
      new Amount(minimalCellCapacity(exchangeProviderCell).toString(), AmountUnit.shannon),
    );
    return ckbAmount.add(feeCkb);
  }

  private calcNeededSudtAmount() {
    const sudtAmountForExchange = new Amount(
      new BigNumber(this.options.sudtAmountForExchange).toString(),
      AmountUnit.shannon,
    );
    const sudtAmountForRecipient = new Amount(
      new BigNumber(this.options.sudtAmountForRecipient).toString(),
      AmountUnit.shannon,
    );
    return sudtAmountForExchange.add(sudtAmountForRecipient);
  }

  private calcCkbAndSudtSum(cells: PwCell[]): [Amount, Amount] {
    const [ckbSum, sudtSum] = cells.reduce(
      ([cellCapacity, sudtAmount], input) => {
        cellCapacity = cellCapacity.add(input.capacity);
        sudtAmount = sudtAmount.add(input.getSUDTAmount());
        return [cellCapacity, sudtAmount];
      },
      [Amount.ZERO, Amount.ZERO],
    );
    return [ckbSum, sudtSum];
  }

  private checkTransaction(tx: Transaction) {
    const inputs = tx.raw.inputCells;
    const outputs = tx.raw.outputs;

    this.checkCellsCapacity(inputs);
    this.checkCellsCapacity(outputs);

    const [inputCkbSum, inputSudtSum] = this.calcCkbAndSudtSum(inputs);
    const [outputCkbSum, outputSudtSum] = this.calcCkbAndSudtSum(outputs);

    if (inputCkbSum.lt(outputCkbSum)) {
      throw new Error(`Sum(inputs.capacity) < Sum(outputs.capacity)! \
                       Sum(inputs.capacity): ${inputCkbSum}, Sum(outputs.capacity): ${outputCkbSum}`);
    }

    if (inputSudtSum.lt(outputSudtSum)) {
      throw new Error(`Sum(inputs.sudt) < Sum(outputs.sudt)! \
                       Sum(inputs.sudt): ${inputSudtSum}, Sum(outputs.sudt): ${outputSudtSum}`);
    }
  }

  private checkCellsCapacity(cells: PwCell[]) {
    for (const cell of cells) {
      const minCapacity = new Amount(cellOccupiedBytes(cell).toString(), AmountUnit.ckb);

      if (minCapacity.gt(cell.capacity)) {
        throw new Error(
          `Capacity of the cell is too small! Capacity: ${cell.capacity}, Occupied bytes: ${minCapacity}`,
        );
      }
    }
  }
}
