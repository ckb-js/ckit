import { Address, HexNumber } from '@ckb-lumos/base';
import { CkbTypeScript, EntrySigner } from '@ckitjs/base';
import { Amount, Builder, Cell, RawTransaction, Transaction } from '@lay2/pw-core';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { boom } from '../../utils';
import { byteLenOfCkbLiveCell, byteLenOfSudt } from '../builder-utils';
import { AbstractPwSenderBuilder } from './AbstractPwSenderBuilder';

interface TransferOptions {
  readonly recipient: Address;
  readonly sudt: CkbTypeScript;
  amount: HexNumber;
  policy: 'findAcp' | 'createCell' | 'findOrCreate';
}

export class TransferSudtPwBuilder extends AbstractPwSenderBuilder {
  constructor(private options: TransferOptions[], provider: CkitProvider, private signer: EntrySigner) {
    super(provider);
  }

  deduplicateOptions(options: TransferOptions[]): TransferOptions[] {
    const deduplicateOptions = new Map<string, TransferOptions>();
    options.forEach((option) => {
      const existedOption = deduplicateOptions.get(option.recipient);
      if (existedOption) {
        if (existedOption.policy !== option.policy)
          throw new Error('error: same recipient and sudt, but different policy');
        existedOption.amount = new Amount(existedOption.amount, 0).add(new Amount(option.amount, 0)).toHexString();
      } else {
        deduplicateOptions.set(option.recipient, option);
      }
    });
    return Array.from(deduplicateOptions.values());
  }

  // TODO pre handle params
  async build(): Promise<Transaction> {
    const sender = await this.signer.getAddress();

    const optionsGroupBySudt = new Map<string, TransferOptions[]>();
    this.options.forEach((options) => {
      const oldrecipientOptions = optionsGroupBySudt.get(options.sudt.args);
      const newrecipientOptions =
        oldrecipientOptions === undefined
          ? [
              {
                recipient: options.recipient,
                amount: options.amount,
                sudt: options.sudt,
                policy: options.policy,
              },
            ]
          : oldrecipientOptions.concat({
              recipient: options.recipient,
              amount: options.amount,
              sudt: options.sudt,
              policy: options.policy,
            });
      optionsGroupBySudt.set(options.sudt.args, newrecipientOptions);
    });

    const senderSudtInputCells = new Array<Cell>(0);
    const recipientSudtInputCells = new Array<Cell>(0);
    const senderSudtOutputCells = new Array<Cell>(0);
    const recipientSudtOutputCells = new Array<Cell>(0);

    for (const item of optionsGroupBySudt) {
      let [, optionsOfSameSudt] = item;
      optionsOfSameSudt = this.deduplicateOptions(optionsOfSameSudt);
      const sudtScript = optionsOfSameSudt[0]!.sudt;

      let totalTransferAmount = new Amount('0', 0);
      for (const option of optionsOfSameSudt) {
        totalTransferAmount = totalTransferAmount.add(new Amount(option.amount, 0));
        if (option.policy === 'findOrCreate') {
          const recipientLiveSudtCell = (await this.provider.collectUdtCells(option.recipient, sudtScript, '0'))[0];
          option.policy = recipientLiveSudtCell ? 'findAcp' : 'createCell';
        }
        switch (option.policy) {
          case 'findAcp': {
            const recipientLiveSudtCell = (await this.provider.collectUdtCells(option.recipient, sudtScript, '0'))[0];
            if (!recipientLiveSudtCell) boom(`recipient ${option.recipient} has no cell to carry the udt`);
            const recipientSudtInputCell: Cell = new Cell(
              new Amount(recipientLiveSudtCell.output.capacity, 0),
              Pw.toPwScript(recipientLiveSudtCell.output.lock),
              recipientLiveSudtCell.output.type && Pw.toPwScript(recipientLiveSudtCell.output.type),
              Pw.toPwOutPoint(recipientLiveSudtCell.out_point),
              recipientLiveSudtCell.output_data,
            );
            // increase recipient sudt
            const recipientSudtOutputCell = recipientSudtInputCell.clone();
            recipientSudtOutputCell.setSUDTAmount(
              recipientSudtOutputCell.getSUDTAmount().add(new Amount(option.amount, 0)),
            );

            recipientSudtInputCells.push(recipientSudtInputCell);
            recipientSudtOutputCells.push(recipientSudtOutputCell);
            break;
          }
          case 'createCell': {
            const recipientSudtOutputCell = new Cell(
              new Amount('1', 0).add(new Amount(String(byteLenOfSudt()))),
              Pw.toPwScript(this.provider.parseToScript(option.recipient)),
              Pw.toPwScript(sudtScript),
              undefined,
              new Amount(option.amount, 0).toUInt128LE(),
            );
            recipientSudtOutputCells.push(recipientSudtOutputCell);
            break;
          }
        }
      }

      const senderLiveSudtCells = await this.provider.collectUdtCells(
        sender,
        sudtScript,
        totalTransferAmount.toHexString(),
      );
      const senderSudtInputCell: Cell[] = senderLiveSudtCells.map(
        (point) =>
          new Cell(
            new Amount(point.output.capacity, 0),
            Pw.toPwScript(point.output.lock),
            point.output.type && Pw.toPwScript(point.output.type),
            Pw.toPwOutPoint(point.out_point),
            point.output_data,
          ),
      );
      senderSudtInputCells.push(...senderSudtInputCell);

      const senderSudtOutputCell = senderSudtInputCell.reduce((sum, input) => {
        sum.capacity = sum.capacity.add(input.capacity);
        sum.setSUDTAmount(sum.getSUDTAmount().add(input.getSUDTAmount()));
        return sum;
      });
      senderSudtOutputCell.setSUDTAmount(
        senderSudtOutputCell.getSUDTAmount().sub(new Amount(totalTransferAmount.toString(), 0)),
      );
      senderSudtOutputCells.push(senderSudtOutputCell);
    }

    const senderSudtOutputCellsCapacity = senderSudtOutputCells.reduce(
      (sum, cell) => sum.add(cell.capacity),
      Amount.ZERO,
    );

    const senderSudtInputCellsCapacity = senderSudtInputCells.reduce(
      (sum, cell) => sum.add(cell.capacity),
      Amount.ZERO,
    );

    const recipientSudtOutputCellsCapacity = recipientSudtOutputCells.reduce(
      (sum, cell) => sum.add(cell.capacity),
      Amount.ZERO,
    );

    const recipientSudtInputCellsCapacity = recipientSudtInputCells.reduce(
      (sum, cell) => sum.add(cell.capacity),
      Amount.ZERO,
    );

    const outputsNeededCapacity = recipientSudtOutputCellsCapacity
      .add(senderSudtOutputCellsCapacity)
      // additional 61 ckb to ensure capacity is enough for change cell
      .add(new Amount(String(byteLenOfCkbLiveCell())))
      // additional 1 ckb for tx fee, not all 1ckb will be paid,
      // but the real fee will be calculated based on feeRate
      .add(new Amount('1'));

    const inputsContainedCapacity = recipientSudtInputCellsCapacity.add(senderSudtInputCellsCapacity);

    const cellDeps = this.getCellDeps();

    if (inputsContainedCapacity.lt(outputsNeededCapacity)) {
      const needSupplyCapacity = outputsNeededCapacity.sub(inputsContainedCapacity);
      const supplyCapacityLiveCells = await this.provider.collectCkbLiveCells(sender, needSupplyCapacity.toHexString());

      const supplyCapacityInputCells = supplyCapacityLiveCells.map(Pw.toPwCell);
      const capacityChangeCell = supplyCapacityInputCells[0]!.clone();
      capacityChangeCell.capacity = supplyCapacityInputCells.reduce((sum, cell) => sum.add(cell.capacity), Amount.ZERO);

      const tx = new Transaction(
        new RawTransaction(
          senderSudtInputCells.concat(recipientSudtInputCells).concat(supplyCapacityInputCells),
          senderSudtOutputCells.concat(recipientSudtOutputCells).concat([capacityChangeCell]),
          cellDeps,
        ),
        senderSudtInputCells.map(() => this.getWitnessPlaceholder(sender)),
      );
      const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));

      capacityChangeCell.capacity = capacityChangeCell.capacity
        .sub(fee)
        .add(inputsContainedCapacity)
        .sub(recipientSudtOutputCellsCapacity)
        .sub(senderSudtOutputCellsCapacity);

      return tx;
    }

    const tx = new Transaction(
      new RawTransaction(
        senderSudtInputCells.concat(recipientSudtInputCells),
        senderSudtOutputCells.concat(recipientSudtOutputCells),
        cellDeps,
      ),
      senderSudtInputCells.map(() => this.getWitnessPlaceholder(sender)),
    );
    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));
    const changeCapacity = inputsContainedCapacity
      .sub(recipientSudtOutputCellsCapacity)
      .sub(senderSudtOutputCellsCapacity)
      .sub(fee);
    senderSudtOutputCells[0]!.capacity = senderSudtOutputCells[0]!.capacity.add(changeCapacity);
    return tx;
  }
}
