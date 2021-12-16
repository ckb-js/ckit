import { formatByteLike, toBuffer } from '@ckitjs/easy-byte';
import { OmniSupplyOutputData, RcIdentityLockArgs, RcSupplyLockArgs, RcSupplyLockHelper } from '@ckitjs/rc-lock';
import { bytes } from '@ckitjs/utils';
import { Amount, Builder, Cell, RawTransaction, Transaction } from '@lay2/pw-core';
import JSBI from 'jsbi';
import { groupBy, map, partition } from 'lodash';
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs';
import { NoAvailableCellError } from '../../errors';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { nonNullable } from '../../utils';
import { RecipientOptions } from '../MintSudtBuilder';
import { byteLenOfLockOnlyCell, byteLenOfSudt } from '../builder-utils';
import { AbstractPwSenderBuilder } from '../pw/AbstractPwSenderBuilder';
import { MintRcUdtOptions } from './MintRcUdtBuilder';

export class MintRcUdtPwBuilder extends AbstractPwSenderBuilder {
  constructor(private options: MintRcUdtOptions, protected provider: CkitProvider) {
    super(provider);
  }

  private async determineFindOrCreate(): Promise<RecipientOptions[]> {
    const helper = new RcSupplyLockHelper(this.provider.mercury, {
      rcLock: this.provider.newScriptTemplate('RC_LOCK'),
      sudtType: this.provider.newScriptTemplate('SUDT'),
    });

    const resolvedInfoCells = await helper.listCreatedInfoCells(this.options);

    const rcUdtInfoCell = nonNullable(resolvedInfoCells[0]);
    const udtType = this.provider.newSudtScript(this.provider.parseToAddress(rcUdtInfoCell.output.lock));

    // recipients -> [findOrCreate, findAcp + createCell]
    const [findOrCreatePolicies, alreadyDetermined] = partition(
      this.options.recipients,
      (item) => item.capacityPolicy === 'findOrCreate',
    );

    // findOrCreate -> {'addr1': [option1, option2], 'addr2': [option3]}
    const groupByRecipient = groupBy(findOrCreatePolicies, (item) => item.recipient);

    // {'addr1': [option1, option2], 'addr2': [option1]} -> [ merge(option1, option2), merge(option3) ]
    const mergedFindOrCreatePolicies = map(groupByRecipient, (items) =>
      items.reduce((left, right) => ({
        ...left,
        amount: new Amount(left.amount, 0).add(new Amount(right.amount, 0)).toHexString(),
        additionalCapacity: new Amount(left.additionalCapacity || '0', 0)
          .add(new Amount(right.additionalCapacity || '0', 0))
          .toHexString(),
      })),
    );

    const recipients = from(mergedFindOrCreatePolicies).pipe(
      mergeMap(
        (item) =>
          this.provider.collectUdtCells(item.recipient, udtType, '0').then((cells) => ({
            ...item,
            capacityPolicy: cells.length > 0 ? ('findAcp' as const) : ('createCell' as const),
          })),
        5,
      ),
      toArray(),
    );

    const determinedFindOrUpdatePolicies: RecipientOptions[] = await lastValueFrom(recipients);
    return determinedFindOrUpdatePolicies.concat(alreadyDetermined);
  }

  async build(): Promise<Transaction> {
    this.options = {
      ...this.options,
      recipients: await this.determineFindOrCreate(),
    };

    const helper = new RcSupplyLockHelper(this.provider.mercury, {
      rcLock: this.provider.newScriptTemplate('RC_LOCK'),
      sudtType: this.provider.newScriptTemplate('SUDT'),
    });

    const resolvedInfoCells = await helper.listCreatedInfoCells(this.options);

    const rcUdtInfoCell = nonNullable(resolvedInfoCells[0]);
    const { rc_identity_flag, rc_identity_pubkey_hash } = RcSupplyLockArgs.decode(
      toBuffer(rcUdtInfoCell.output.lock.args),
    );
    const infoCell = Pw.toPwCell(rcUdtInfoCell);

    const capacityProviderAddress = this.provider.parseToAddress(
      this.provider.newScript(
        'RC_LOCK',
        formatByteLike(
          RcIdentityLockArgs.encode({ rc_identity_flag, rc_identity_pubkey_hash, rc_lock_flag: 0 /* owner mode */ }),
          {
            pad0x: true,
          },
        ),
      ),
    );

    const udtType = this.provider.newSudtScript(this.provider.parseToAddress(rcUdtInfoCell.output.lock));

    // capacity provided by issuer
    const createdRecipientCells = this.options.recipients
      .filter((item) => item.capacityPolicy === 'createCell')
      .map(
        (item) =>
          new Cell(
            new Amount(String(item.additionalCapacity || 0), 0).add(new Amount(String(byteLenOfSudt()))),
            Pw.toPwScript(this.provider.parseToScript(item.recipient)), // recipient lock
            Pw.toPwScript(udtType), // issued sudt type
            undefined,
            new Amount(item.amount, 0).toUInt128LE(),
          ),
      );

    // capacity provided by recipient
    const resolvedFindAcpCells = this.options.recipients.filter((item) => item.capacityPolicy === 'findAcp');
    const foundRecipientCells$ = from(resolvedFindAcpCells).pipe(
      // collect the udt cell from recipients, throw an error if no udt cell is found
      mergeMap(async (item) => {
        const resolved = (await this.provider.collectUdtCells(item.recipient, udtType, '0'))[0];
        if (!resolved) {
          throw new NoAvailableCellError({ lock: this.provider.parseToScript(item.recipient), type: udtType });
        }

        const cell = Pw.toPwCell(resolved);
        cell.capacity = cell.capacity.add(new Amount(item.additionalCapacity || '0', 0));
        cell.setSUDTAmount(cell.getSUDTAmount().add(new Amount(item.amount, 0)));

        return cell;
      }, 5),
      toArray(),
    );
    const foundRecipientCells = await lastValueFrom(foundRecipientCells$);

    // occupied + additional
    const createdRecipientCellsCapacity = createdRecipientCells.reduce(
      (sum, createdCell) => sum.add(createdCell.capacity),
      Amount.ZERO,
    );
    const foundRecipientCellsAdditionalCapacity = resolvedFindAcpCells.reduce(
      (sum, foundCell) => sum.add(new Amount(foundCell.additionalCapacity || '0', 0)),
      Amount.ZERO,
    );

    const neededCapacityFromIssuer = Amount.ZERO
      // createCell pocily needed capcacity
      .add(createdRecipientCellsCapacity)
      // findAcp policy needed additional capacity
      .add(foundRecipientCellsAdditionalCapacity)
      // additional rc-lock script occupied ckb to ensure capacity is enough for change cell
      .add(new Amount(String(byteLenOfLockOnlyCell(RcIdentityLockArgs.byteWidth))))
      // additional 1 ckb for tx fee, not all 1ckb will be paid,
      // but the real fee will be calculated based on feeRate
      .add(new Amount('1'));

    const issuerOutpoints = await this.provider.collectCkbLiveCells(
      capacityProviderAddress,
      neededCapacityFromIssuer.toHexString(),
    );

    const senderCells = issuerOutpoints.map(Pw.toPwCell);

    // sender change cell
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const senderOutput = senderCells[0]!.clone();
    senderOutput.capacity = senderCells.reduce((sum, inputCell) => sum.add(inputCell.capacity), Amount.ZERO);

    // modify current_supply
    const mintedSudtAmount = this.options.recipients.reduce(
      (acc, recipient) => JSBI.add(acc, JSBI.BigInt(recipient.amount)),
      JSBI.BigInt(0),
    );
    const dataBuf = toBuffer(infoCell.getHexData());
    const decoded = OmniSupplyOutputData.decode(dataBuf);
    const encoded = OmniSupplyOutputData.encode({
      ...decoded,
      current_supply: JSBI.add(decoded.current_supply, mintedSudtAmount),
    });
    dataBuf.write(encoded.toString('hex'), 'hex');
    infoCell.setHexData(bytes.toHex(dataBuf));

    const inputCells = [infoCell, ...senderCells, ...foundRecipientCells];
    const rawTx = new RawTransaction(
      inputCells,
      [infoCell, senderOutput, ...createdRecipientCells, ...foundRecipientCells],
      this.getCellDepsByCells(inputCells, [infoCell, senderOutput, ...createdRecipientCells, ...foundRecipientCells]),
    );

    const tx = new Transaction(rawTx, [
      this.getWitnessPlaceholder(capacityProviderAddress), // info lock
      this.getWitnessPlaceholder(capacityProviderAddress), // capacity provider lock
    ]);

    const fee = Builder.calcFee(tx, Number(this.provider.config.MIN_FEE_RATE));

    senderOutput.capacity = senderOutput.capacity
      .sub(fee)
      .sub(createdRecipientCellsCapacity)
      .sub(foundRecipientCellsAdditionalCapacity);

    return tx;
  }
}
