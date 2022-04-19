import { Address } from '@ckb-lumos/base';
import { debug } from '@ckitjs/utils';
import { Amount, Builder, Cell, RawTransaction, Transaction } from '@lay2/pw-core';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { boom } from '../../utils';
import { RecipientOption, TransferSudtOptions } from '../AcpTransferSudtBuilder';
import { byteLenOfLockOnlyCell, byteLenOfSudt } from '../builder-utils';
import { AbstractPwSenderBuilder } from './AbstractPwSenderBuilder';

export class TransferSudtPwBuilder extends AbstractPwSenderBuilder {
  constructor(private options: TransferSudtOptions, provider: CkitProvider, private sender: Address) {
    super(provider);
  }

  async build(): Promise<Transaction> {
    const optionsGroupBySudt = new Map<string, RecipientOption[]>();
    this.options.recipients.forEach((options) => {
      const oldRecipientOptions = optionsGroupBySudt.get(options.sudt.args);
      const newRecipientOptions =
        oldRecipientOptions === undefined
          ? [
              {
                recipient: options.recipient,
                amount: options.amount,
                sudt: options.sudt,
                policy: options.policy,
                additionalCapacity: options.additionalCapacity,
                createCapacity: options.createCapacity,
              },
            ]
          : oldRecipientOptions.concat({
              recipient: options.recipient,
              amount: options.amount,
              sudt: options.sudt,
              policy: options.policy,
              additionalCapacity: options.additionalCapacity,
              createCapacity: options.createCapacity,
            });
      optionsGroupBySudt.set(options.sudt.args, newRecipientOptions);
    });

    const senderSudtInputCells: Cell[] = [];
    const recipientSudtInputCells: Cell[] = [];
    const senderSudtOutputCells: Cell[] = [];
    const recipientSudtOutputCells: Cell[] = [];
    const recipientCreateOutputCells: Cell[] = [];

    // 1. handle sudt cells
    for (const item of optionsGroupBySudt) {
      let [, optionsOfSameSudt] = item;
      optionsOfSameSudt = this.deduplicateOptions(optionsOfSameSudt);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const sudtScript = optionsOfSameSudt[0]!.sudt;
      let totalTransferAmount = new Amount('0', 0);

      // build sudt cells of recipients
      for (const option of optionsOfSameSudt) {
        totalTransferAmount = totalTransferAmount.add(new Amount(option.amount, 0));

        if (option.policy === 'findOrCreate') {
          const recipientLiveSudtCell = (await this.provider.collectUdtCells(option.recipient, sudtScript, '0'))[0];
          option.policy = recipientLiveSudtCell ? 'findAcp' : 'createCell';
        }
        switch (option.policy) {
          case 'findAcp': {
            if (option.createCapacity) debug(`WARN: “createCapacity” cannot use with “findAcp” policy`);

            const recipientLiveSudtCell = (await this.provider.collectUdtCells(option.recipient, sudtScript, '0'))[0];
            if (!recipientLiveSudtCell) boom(`recipient ${option.recipient} has no cell to carry the udt`);
            const recipientSudtInputCell: Cell = new Cell(
              new Amount(recipientLiveSudtCell.output.capacity, 0),
              Pw.toPwScript(recipientLiveSudtCell.output.lock),
              recipientLiveSudtCell.output.type && Pw.toPwScript(recipientLiveSudtCell.output.type),
              Pw.toPwOutPoint(recipientLiveSudtCell.out_point),
              recipientLiveSudtCell.output_data,
            );
            const recipientSudtOutputCell: Cell = new Cell(
              new Amount(recipientLiveSudtCell.output.capacity, 0).add(new Amount(option.additionalCapacity ?? '0', 0)),
              Pw.toPwScript(recipientLiveSudtCell.output.lock),
              recipientLiveSudtCell.output.type && Pw.toPwScript(recipientLiveSudtCell.output.type),
              undefined,
              recipientLiveSudtCell.output_data,
            );
            recipientSudtOutputCell.setSUDTAmount(
              recipientSudtOutputCell.getSUDTAmount().add(new Amount(option.amount, 0)),
            );

            recipientSudtInputCells.push(recipientSudtInputCell);
            recipientSudtOutputCells.push(recipientSudtOutputCell);
            break;
          }
          case 'createCell': {
            if (option.createCapacity) {
              recipientCreateOutputCells.push(
                new Cell(
                  new Amount(option.createCapacity, 0),
                  Pw.toPwScript(this.provider.parseToScript(option.recipient)),
                ),
              );
            }

            // defaults additional capacity to 1 CKB
            option.additionalCapacity = option.additionalCapacity ?? (10 ** 8).toString();

            const recipientSudtOutputCell = new Cell(
              new Amount(option.additionalCapacity, 0).add(
                new Amount(String(byteLenOfSudt(this.getLockscriptArgsLength(option.recipient)))),
              ),
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

      // build sudt cells of sender
      const senderLiveSudtCells = await this.provider.collectUdtCells(
        this.sender,
        sudtScript,
        totalTransferAmount.toHexString(),
      );
      const senderSudtInputCell: Cell[] = senderLiveSudtCells.map(Pw.toPwCell);
      senderSudtInputCells.push(...senderSudtInputCell);

      const [cellCapacity, sudtAmount] = senderSudtInputCell.reduce(
        ([cellCapacity, sudtAmount], input) => {
          cellCapacity = cellCapacity.add(input.capacity);
          sudtAmount = sudtAmount.add(input.getSUDTAmount());
          return [cellCapacity, sudtAmount];
        },
        [Amount.ZERO, Amount.ZERO],
      );
      const senderSudtOutputCell = new Cell(
        cellCapacity,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        senderSudtInputCell[0]!.lock,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        senderSudtInputCell[0]!.type,
        undefined,
        sudtAmount.toUInt128LE(),
      );

      senderSudtOutputCell.setSUDTAmount(senderSudtOutputCell.getSUDTAmount().sub(totalTransferAmount));
      senderSudtOutputCells.push(senderSudtOutputCell);
    }

    // 2. handle capacity cells
    const senderSudtInputCellsCapacity = senderSudtInputCells.reduce(
      (sum, cell) => sum.add(cell.capacity),
      Amount.ZERO,
    );
    const senderSudtOutputCellsCapacity = senderSudtOutputCells.reduce(
      (sum, cell) => sum.add(cell.capacity),
      Amount.ZERO,
    );
    const recipientSudtInputCellsCapacity = recipientSudtInputCells.reduce(
      (sum, cell) => sum.add(cell.capacity),
      Amount.ZERO,
    );
    const recipientSudtOutputCellsCapacity = recipientSudtOutputCells.reduce(
      (sum, cell) => sum.add(cell.capacity),
      Amount.ZERO,
    );
    const recipientCreateOutputCellsCapacity = recipientCreateOutputCells.reduce(
      (sum, cell) => sum.add(cell.capacity),
      Amount.ZERO,
    );

    const inputsContainedCapacity = recipientSudtInputCellsCapacity.add(senderSudtInputCellsCapacity);
    const outputsContainedCapacity = recipientSudtOutputCellsCapacity
      .add(senderSudtOutputCellsCapacity)
      .add(recipientCreateOutputCellsCapacity);

    const txWithoutSupplyCapacity = new Transaction(
      new RawTransaction(
        senderSudtInputCells.concat(recipientSudtInputCells),
        senderSudtOutputCells.concat(recipientSudtOutputCells).concat(recipientCreateOutputCells),
        await this.getCellDepsByCells(
          senderSudtInputCells.concat(recipientSudtInputCells),
          senderSudtOutputCells.concat(recipientSudtOutputCells),
        ),
      ),
      senderSudtInputCells.map(() => this.getWitnessPlaceholder(this.sender)),
    );
    const feeWithoutSupplyCapacity = Builder.calcFee(
      txWithoutSupplyCapacity,
      Number(this.provider.config.MIN_FEE_RATE),
    );

    const needSupplyCapacity = feeWithoutSupplyCapacity.add(outputsContainedCapacity.sub(inputsContainedCapacity));

    const senderSudtCellToPayCapacity = senderSudtOutputCells.find((cell) =>
      cell.capacity
        .sub(new Amount(String(byteLenOfSudt(this.getLockscriptArgsLength(this.sender)))))
        .gte(needSupplyCapacity),
    );

    if (senderSudtCellToPayCapacity) {
      senderSudtCellToPayCapacity.capacity = senderSudtCellToPayCapacity.capacity.sub(needSupplyCapacity);
      return txWithoutSupplyCapacity;
    }

    // build tx with extra capacity cell supplied
    const senderLockscriptArgsLen = this.getLockscriptArgsLength(this.sender);
    const outputsNeededCapacity = outputsContainedCapacity
      // additional 61 ckb to ensure capacity is enough for change cell
      .add(new Amount(String(byteLenOfLockOnlyCell(senderLockscriptArgsLen))))
      // additional 1 ckb for tx fee, not all 1ckb will be paid,
      // but the real fee will be calculated based on feeRate
      .add(new Amount('1'));
    const needSearchCapacity = outputsNeededCapacity.sub(inputsContainedCapacity);
    const supplyCapacityLiveCells = await this.provider.collectCkbLiveCells(
      this.sender,
      needSearchCapacity.toHexString(),
    );

    const supplyCapacityInputCells = supplyCapacityLiveCells.map(Pw.toPwCell);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const capacityChangeCell = Pw.toPwCell(supplyCapacityLiveCells[0]!);
    capacityChangeCell.capacity = supplyCapacityInputCells.reduce((sum, cell) => sum.add(cell.capacity), Amount.ZERO);

    const inputCells = senderSudtInputCells.concat(recipientSudtInputCells).concat(supplyCapacityInputCells);
    const outputs = senderSudtOutputCells
      .concat(recipientSudtOutputCells)
      .concat(recipientCreateOutputCells)
      .concat([capacityChangeCell]);
    const txWithSupplyCapacity = new Transaction(
      new RawTransaction(inputCells, outputs, await this.getCellDepsByCells(inputCells, outputs)),
      senderSudtInputCells.map(() => this.getWitnessPlaceholder(this.sender)),
    );
    const fee = Builder.calcFee(txWithSupplyCapacity, Number(this.provider.config.MIN_FEE_RATE));
    capacityChangeCell.capacity = capacityChangeCell.capacity
      .sub(fee)
      .add(inputsContainedCapacity)
      .sub(outputsContainedCapacity);

    return txWithSupplyCapacity;
  }

  getLockscriptArgsLength(address: string): number {
    return (this.provider.parseToScript(address).args.length - 2) / 2;
  }

  deduplicateOptions(options: RecipientOption[]): RecipientOption[] {
    const deduplicateOptions = new Map<string, RecipientOption>();
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
}
