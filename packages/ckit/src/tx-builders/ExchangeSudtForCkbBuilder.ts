import { Address, Cell, HexNumber } from '@ckb-lumos/base';
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
import { BigNumber } from 'bignumber.js';
import { Pw } from '../helpers/pw';
import { CkitProvider } from '../providers';
import { AbstractPwSenderBuilder } from './pw/AbstractPwSenderBuilder';

const minExchangeProviderCkb = new Amount('441', AmountUnit.ckb); // 379 + 61 + 1
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
      - exchangeProviderCells
          - capacity: exchangeCkbSum - ckbAmountForRecipient - fee
          - data.amount: exchangeSudtSum + sudtAmountForExchange
      - sudtCells
          - capacity: sudtCkbSum
          - data.amount: sudtSum - sudtAmountForExchange - sudtAmountForRecipient
      - recipientCell
          - capacity: ckbAmountForRecipient
          - data.amount: sudtAmountForRecipient
  */
  async build(): Promise<Transaction> {
    const sudtAmountForExchange = new Amount(new BigNumber(this.options.sudtAmountForExchange).toString(), 0);
    const sudtAmountForRecipient = new Amount(new BigNumber(this.options.sudtAmountForRecipient).toString(), 0);
    const neededSudtAmount = sudtAmountForExchange.add(sudtAmountForRecipient);

    const { inExchangeProviderCells, inExchangeProviderCkbSum, inExchangeProviderSudtSum } =
      await this.collectExchangeProviderCells(this.minExchangeProviderCkb());

    const { inSudtCells, inSudtSum } = await this.collectSudtCells(neededSudtAmount);

    const outExchangeCell = inExchangeProviderCells[0]!.clone();
    const ckbAmountForRecipient = new Amount(
      new BigNumber(this.options.ckbAmountForRecipient).toString(),
      AmountUnit.shannon,
    );
    outExchangeCell.capacity = inExchangeProviderCkbSum.sub(ckbAmountForRecipient);
    outExchangeCell.setSUDTAmount(inExchangeProviderSudtSum.add(sudtAmountForExchange));

    const outSudtCell = inSudtCells[0]!.clone();
    outSudtCell.setSUDTAmount(inSudtSum.sub(neededSudtAmount));

    const outRecipientCell = new PwCell(
      ckbAmountForRecipient,
      Pw.toPwScript(this.provider.parseToScript(this.options.exchangeRecipient)),
      Pw.toPwScript(this.options.sudt),
    );
    outRecipientCell.setSUDTAmount(sudtAmountForRecipient);

    const inputs = [...inExchangeProviderCells, ...inSudtCells];
    const outputs = [outExchangeCell, outSudtCell, outRecipientCell];
    const cellDeps = await this.getCellDepsByCells(inputs, outputs);
    const rawTx = new RawTransaction(inputs, outputs, cellDeps);

    const tx = new Transaction(rawTx, this.witness(inExchangeProviderCells, inSudtCells) as WitnessArgs[]);

    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));
    outExchangeCell.capacity = outExchangeCell.capacity.sub(fee);

    this.checkTransaction(tx);

    return tx;
  }

  private witness(firstInputs: PwCell[], secondInputs: PwCell[]): WitnessArgs[] {
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

  private async collectSudtCells(neededSudtAmount: Amount) {
    const sudtOutpoints = await this.provider.collectUdtCells(
      this.options.sudtSender,
      this.options.sudt,
      neededSudtAmount.toHexString(),
    );

    const inSudtCells = sudtOutpoints.map(Pw.toPwCell);
    const inSudtSum = inSudtCells.reduce((acc, next) => acc.add(next.getSUDTAmount()), Amount.ZERO);
    return { inSudtCells, inSudtSum };
  }

  private async collectExchangeProviderCells(minExchangeProviderCkb: Amount) {
    let inExchangeProviderCells: PwCell[] = [];
    if (typeof this.options.exchangeProvider === 'string') {
      const exchangeOutputs = await this.provider.collectUdtCellsByMinCkb(
        this.options.exchangeProvider as Address,
        this.options.sudt,
        minExchangeProviderCkb.toHexString(),
      );
      inExchangeProviderCells = exchangeOutputs.map(Pw.toPwCell);
    } else {
      inExchangeProviderCells = this.options.exchangeProvider.map(Pw.toPwCell);
    }

    const inCkbAndSudt = this.calcCkbAndSudtSum(inExchangeProviderCells);
    const [inExchangeProviderCkbSum, inExchangeProviderSudtSum] = inCkbAndSudt;

    return { inExchangeProviderCells, inExchangeProviderCkbSum, inExchangeProviderSudtSum };
  }

  private minExchangeProviderCkb() {
    const ckbAmountForRecipient = new Amount(
      new BigNumber(this.options.ckbAmountForRecipient).toString(),
      AmountUnit.shannon,
    );
    let ckbAmount = ckbAmountForRecipient;
    if (ckbAmountForRecipient.lt(minExchangeProviderCkb)) {
      ckbAmount = minExchangeProviderCkb;
    }
    return ckbAmount.add(feeCkb);
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
}
