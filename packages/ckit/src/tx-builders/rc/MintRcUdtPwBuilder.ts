import { formatByteLike, toBuffer } from '@ckit/easy-byte';
import { bytes } from '@ckit/utils';
import { Amount, Builder, Cell, RawTransaction, Transaction } from '@lay2/pw-core';
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs';
import { NoAvailableCellError } from '../../errors';
import { Pw } from '../../helpers/pw';
import { CkitProvider } from '../../providers';
import { nonNullable } from '../../utils';
import { byteLenOfCkbLiveCell, byteLenOfSudt } from '../builder-utils';
import { AbstractPwSenderBuilder } from '../pw/AbstractPwSenderBuilder';
import { MintRcUdtOptions } from './MintRcUdtBuilder';
import { RcIdentityLockArgs, RcLockFlag, RcSupplyLockArgs, RcSupplyOutputData } from './rc-helper';

export class MintRcUdtPwBuilder extends AbstractPwSenderBuilder {
  constructor(private options: MintRcUdtOptions, protected provider: CkitProvider) {
    super(provider);
  }

  async build(): Promise<Transaction> {
    const rcSupplyCell = await this.provider.mercury.get_cells({
      search_key: {
        script: this.provider.newScript(
          'RC_LOCK',
          bytes.toHex(
            RcSupplyLockArgs.encode({
              rc_identity_flag: this.options.rcIdentity.flag,
              rc_identity_pubkey_hash: this.options.rcIdentity.pubkeyHash,
              rc_lock_flag: RcLockFlag.SUPPLY_MASK,
              type_id_hash: this.options.udtId,
            }),
          ),
        ),
        script_type: 'lock',
      },
    });

    const rcUdtInfoCell = nonNullable(rcSupplyCell.objects[0]);
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
      .filter((item) => item.capacityPolicy === 'createAcp')
      .map(
        (item) =>
          new Cell(
            new Amount(String(BigInt(item.additionalCapacity || 0)), 0).add(new Amount(String(byteLenOfSudt()))),
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

    const createdRecipientCellsCapacity = createdRecipientCells.reduce(
      (sum, createdCell) => sum.add(createdCell.capacity),
      Amount.ZERO,
    );
    const foundRecipientCellsAdditionalCapacity = resolvedFindAcpCells.reduce(
      (sum, foundCell) => sum.add(new Amount(foundCell.additionalCapacity || '0', 0)),
      Amount.ZERO,
    );

    const neededCapacityFromIssuer = createdRecipientCellsCapacity
      .add(foundRecipientCellsAdditionalCapacity)
      // additional 61 ckb to ensure capacity is enough for change cell
      .add(new Amount(String(byteLenOfCkbLiveCell())))
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
    const mintedSudtAmount = this.options.recipients.reduce((acc, recipient) => BigInt(recipient.amount) + acc, 0n);
    const dataBuf = toBuffer(infoCell.getHexData());
    const decoded = RcSupplyOutputData.decode(dataBuf);
    const encoded = RcSupplyOutputData.encode({
      ...decoded,
      current_supply: decoded.current_supply + mintedSudtAmount,
    });
    dataBuf.write(encoded.toString('hex'), 'hex');
    infoCell.setHexData(bytes.toHex(dataBuf));

    const rawTx = new RawTransaction(
      [infoCell, ...senderCells, ...foundRecipientCells],
      [infoCell, senderOutput, ...createdRecipientCells, ...foundRecipientCells],
      this.getCellDeps(),
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