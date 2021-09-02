import { Hash, HexNumber, HexString, Script, utils } from '@ckb-lumos/base';
import { createField, createFixedStruct, Field, formatByteLike, toBuffer, U128LE, U8 } from '@ckit/easy-byte';
import { MercuryClient, SearchKey, ResolvedOutpoint } from '@ckit/mercury-client';
import { bytes } from '@ckit/utils';
import { Reader } from 'ckb-js-toolkit';
import { from, lastValueFrom } from 'rxjs';
import { concatMap, expand, toArray, takeWhile } from 'rxjs/operators';
import { UdtInfo } from './generated/rc_udt_info';

function Bytes(byteWidth: number): Field<HexString> {
  return {
    byteWidth,
    read(buf, offset = 0) {
      return formatByteLike(buf.slice(offset, offset + byteWidth), { pad0x: true });
    },
    write(buf, val, offset = 0) {
      const byte = formatByteLike(val, { rm0x: true });
      buf.write(byte, offset, byteWidth, 'hex');
    },
  };
}

export const RcIdentityLockArgs = createFixedStruct()
  .field(
    'rc_identity_flag',
    createField<RcIdentityFlag>(1, (buf, offset) => convertToRcIdentityFlag(buf.readUInt8(offset)), U8.write),
  )
  .field('rc_identity_pubkey_hash', Bytes(20))
  .field('rc_lock_flag', U8);

export const RcSupplyLockArgs = RcIdentityLockArgs.field('type_id_hash', Bytes(32));

export const RcSupplyOutputData = createFixedStruct()
  .field('version', U8)
  .field('current_supply', U128LE)
  .field('max_supply', U128LE)
  .field('sudt_script_hash', Bytes(32));

/**
 * {@link https://github.com/XuJiandong/ckb-c-stdlib/blob/4eca989f8a/ckb_identity.h#L45-L51 RC Identity}
 */
export enum RcIdentityFlag {
  CKB = 0x00,
  ETH = 0x01,
}

export function convertToRcIdentityFlag(flag: HexString | number): RcIdentityFlag {
  const num = Number(bytes.toHex(flag));

  if (num === RcIdentityFlag.CKB) return RcIdentityFlag.CKB;
  if (num === RcIdentityFlag.ETH) return RcIdentityFlag.ETH;

  throw new Error(`Unknown RC Identity flag: ${num}`);
}

export enum RcLockFlag {
  ROOT = 1,
  ACP_MASK = 1 << 1,
  SINCE_MASK = 1 << 2,
  SUPPLY_MASK = 1 << 3,
}

export interface SudtStaticInfo {
  name: string;
  symbol: string;
  decimals: number;
  // supply without decimals, the maxSupply MUST large than 10^decimals
  maxSupply: HexNumber;
  description: string;
}

export interface RcIdentity {
  flag: RcIdentityFlag;
  pubkeyHash: HexString;
}
export interface SudtInfo extends SudtStaticInfo {
  version: HexString;
  /**
   * rc info cell type id hash
   */
  udtId: Hash;
  currentSupply: HexNumber;

  rcIdentity: RcIdentity;
}

type ScriptTemplate = Omit<Script, 'args'>;
export interface RcHelperConfig {
  rcLock: ScriptTemplate;
  sudtType: ScriptTemplate;
}

/**
 * convert a resolved rc-udt cell to {@link SudtInfo}
 * @param cell
 */
export function convertToSudtInfo(cell: ResolvedOutpoint): SudtInfo {
  const { rc_identity_flag, rc_identity_pubkey_hash, type_id_hash } = RcSupplyLockArgs.decode(
    toBuffer(cell.output.lock.args),
  );

  const { current_supply, max_supply, version } = RcSupplyOutputData.decode(toBuffer(cell.output_data));
  const fixedDataLen = RcSupplyOutputData.fields.reduce((acc, field) => acc + field[1].byteWidth, 0);
  const udtInfo = new UdtInfo(new Reader(bytes.toHex(cell.output_data.slice(2 /*0x*/ + fixedDataLen * 2))));

  return {
    rcIdentity: { flag: rc_identity_flag, pubkeyHash: rc_identity_pubkey_hash },
    udtId: type_id_hash,
    version: bytes.toHex(version),
    currentSupply: bytes.toHex(current_supply),
    maxSupply: bytes.toHex(max_supply),

    description: Buffer.from(udtInfo.getDescription().raw()).toString(),
    symbol: Buffer.from(udtInfo.getSymbol().raw()).toString(),
    name: Buffer.from(udtInfo.getName().raw()).toString(),
    decimals: udtInfo.getDecimals(),
  };
}

export class RcSupplyLockHelper {
  constructor(private indexer: MercuryClient, private config: RcHelperConfig) {}

  async listCreatedSudt(options: { rcIdentity: RcIdentity; udtId?: Hash }): Promise<SudtInfo[]> {
    const { rcIdentity, udtId } = options;
    const mercury = this.indexer;

    const searchKey: SearchKey = {
      script: {
        ...this.config.rcLock,
        args: bytes.concat(rcIdentity.flag, rcIdentity.pubkeyHash, RcLockFlag.SUPPLY_MASK, udtId ?? ''),
      },
      script_type: 'lock',
    };
    const supplyCells$ = from(mercury.get_cells({ search_key: searchKey })).pipe(
      expand((res) => mercury.get_cells({ search_key: searchKey, after_cursor: res.last_cursor }), 1),
      takeWhile((res) => res.objects.length > 0),
      concatMap((res) => res.objects),
      toArray(),
    );

    const supplyCells = await lastValueFrom(supplyCells$);
    return supplyCells.map(convertToSudtInfo);
  }

  /**
   * generate sudt script which was issued by a rc_lock_supply
   * @param options
   */
  newSudtScript({ rcIdentity, udtId }: { rcIdentity: RcIdentity; udtId: Hash }): Script {
    const infoLock = {
      ...this.config.rcLock,
      args: bytes.toHex(
        RcSupplyLockArgs.encode({
          rc_identity_flag: rcIdentity.flag,
          rc_identity_pubkey_hash: rcIdentity.pubkeyHash,
          rc_lock_flag: RcLockFlag.SUPPLY_MASK,
          type_id_hash: udtId,
        }),
      ),
    };

    return {
      ...this.config.sudtType,
      args: utils.computeScriptHash(infoLock),
    };
  }
}
