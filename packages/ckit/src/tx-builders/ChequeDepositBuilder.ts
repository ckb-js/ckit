import { Address, HexNumber, utils } from '@ckb-lumos/base';
import { minimalCellCapacity } from '@ckb-lumos/helpers';
import {
  Amount,
  Builder,
  Cell,
  hexDataOccupiedBytes,
  RawTransaction,
  toBigUInt128LE,
  Transaction,
} from '@lay2/pw-core';
import { CkbTypeScript } from '..';
import { Pw } from '../helpers/pw';
import { CkitProvider } from '../providers';
import { asserts } from '../utils';
import { byteLenOfCkbLiveCell, byteLenOfSudt } from './builder-utils';
import { AbstractPwSenderBuilder } from './pw/AbstractPwSenderBuilder';

interface ChequeDepositOptions {
  sudt: CkbTypeScript;
  amount: HexNumber;
  receiver: Address;
  sender: Address;

  /**
   * skip parameter check
   */
  skipCheck?: boolean;
}

/**
 * ```yaml
 * Lock:
 *  code_hash: <cheque_cell_lock_script>
 *  hash_type: type
 *  args:  <receiver_lock_hash[:20]> | <sender_lock_hash[:20]>
 * ```
 */
export class ChequeDepositBuilder extends AbstractPwSenderBuilder {
  constructor(private options: ChequeDepositOptions, provider: CkitProvider) {
    super(provider);

    const { receiver, sender, skipCheck } = options;

    if (skipCheck === true) return;

    asserts(provider.isTemplateOf('SECP256K1_BLAKE160', receiver), 'receiver must be a SECP256K1_BLAKE160 script');

    asserts(
      provider.isTemplateOf('SECP256K1_BLAKE160', sender) || provider.isTemplateOf('RC_LOCK', sender),
      'sender must be a SECP256K1_BLAKE160 script or a RC_LOCK script',
    );
  }
  async build(): Promise<Transaction> {
    const { amount, receiver, sender, sudt } = this.options;

    const receiverLock = this.provider.parseToScript(receiver);
    const senderLock = this.provider.parseToScript(sender);

    const receiverLockHash = utils.computeScriptHash(receiverLock).slice(-40);
    const senderLockHash = utils.computeScriptHash(senderLock).slice(-40);

    const chequeLock = this.provider.newScript('CHEQUE', `0x${receiverLockHash}${senderLockHash}`);

    const chequeOccupied =
      '0x' +
      minimalCellCapacity({
        data: toBigUInt128LE(amount),
        cell_output: { capacity: '0x0', lock: chequeLock, type: sudt },
      }).toString(16);

    const chequeCell = Pw.toPwCell({
      data: toBigUInt128LE(amount),
      cell_output: { capacity: chequeOccupied, lock: chequeLock, type: sudt },
    });

    const changeNeededCapacity = new Amount(chequeOccupied, 0)
      // additional 1 ckb for tx fee, not all 1ckb will be paid,
      // but the real fee will be calculated based on feeRate
      .add(new Amount('1'))
      // capacity for change cell
      .add(new Amount(byteLenOfCkbLiveCell(hexDataOccupiedBytes(senderLock.args)).toString()));

    const collectedSudtCells = (await this.provider.collectUdtCells(this.options.sender, sudt, amount)).map(
      Pw.toPwCell,
    );

    const collectedSudtCapacityAndAmount = collectedSudtCells.reduce<{ ckb: Amount; sudt: Amount }>(
      (acc, cell) => {
        return { ckb: acc.ckb.add(cell.capacity), sudt: acc.sudt.add(cell.getSUDTAmount()) };
      },
      { ckb: Amount.ZERO, sudt: Amount.ZERO },
    );

    const sudtChangeCell = new Cell(
      new Amount(byteLenOfSudt(hexDataOccupiedBytes(senderLock.args)).toString()),
      Pw.toPwScript(senderLock),
      Pw.toPwScript(sudt),
      undefined,
      collectedSudtCapacityAndAmount.sudt.sub(new Amount(amount, 0)).toUInt128LE(),
    );

    const [collectedLockOnlyCells, capacityChangeCell] = await (async (): Promise<[Cell[], Cell]> => {
      const isCollectedSudtEnoughForChangeCell = collectedSudtCapacityAndAmount.ckb
        .sub(sudtChangeCell.capacity)
        .gte(changeNeededCapacity);

      if (isCollectedSudtEnoughForChangeCell) {
        return [
          [] as Cell[],
          new Cell(collectedSudtCapacityAndAmount.ckb.sub(sudtChangeCell.capacity), Pw.toPwScript(senderLock)),
        ];
      }

      const lockOnlyCells = (await this.provider.collectCkbLiveCells(sender, changeNeededCapacity.toHexString())).map(
        Pw.toPwCell,
      );

      return [
        lockOnlyCells,
        new Cell(
          // capacity(collectedLockOnly) + capacity(sudtChangeRemain)
          lockOnlyCells
            .reduce((acc, cell) => acc.add(cell.capacity), Amount.ZERO)
            .add(collectedSudtCapacityAndAmount.ckb.sub(sudtChangeCell.capacity))
            .sub(chequeCell.capacity),
          Pw.toPwScript(senderLock),
        ),
      ];
    })();

    const inputCells = [...collectedSudtCells, ...collectedLockOnlyCells];
    const outputCells = [chequeCell, sudtChangeCell, capacityChangeCell];

    const tx = new Transaction(
      new RawTransaction(inputCells, outputCells, this.getCellDepsByCells(inputCells, outputCells)),
      [this.getWitnessPlaceholder(sender)],
    );

    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));
    capacityChangeCell.capacity = capacityChangeCell.capacity.sub(fee);

    return tx;
  }
}
