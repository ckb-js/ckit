import { Address, Script } from '@ckb-lumos/base';
import { SerializeRcLockWitnessLock } from '@ckitjs/rc-lock';
import { Builder, Cell, CellDep, WitnessArgs } from '@lay2/pw-core';
import { Reader } from 'ckb-js-toolkit';
import { uniqWith, flatMap } from 'lodash';
import { Pw } from '../../helpers/pw';
import { CkitConfigKeys, CkitProvider } from '../../providers';
import { boom } from '../../utils';
import { getCellDeps } from '../unipass/config';

export abstract class AbstractPwSenderBuilder extends Builder {
  protected constructor(protected readonly provider: CkitProvider) {
    super(Number(provider.config.MIN_FEE_RATE));
  }

  protected async getCellDepByKey(key: CkitConfigKeys): Promise<CellDep[]> {
    if (key === 'RC_LOCK') {
      return [
        Pw.toPwCellDep(await this.provider.getCellDep('RC_LOCK')),
        Pw.toPwCellDep(await this.provider.getCellDep('SECP256K1_BLAKE160')),
      ];
    }
    if (key === 'SUDT') return [Pw.toPwCellDep(await this.provider.getCellDep('SUDT'))];
    if (key === 'ANYONE_CAN_PAY') {
      return [
        Pw.toPwCellDep(await this.provider.getCellDep('ANYONE_CAN_PAY')),
        Pw.toPwCellDep(await this.provider.getCellDep('SECP256K1_BLAKE160')),
      ];
    }
    if (key === 'UNIPASS') return getCellDeps(this.provider.config.PREFIX === 'ckb');
    if (key === 'PW_ANYONE_CAN_PAY') {
      return [
        Pw.toPwCellDep(await this.provider.getCellDep('PW_ANYONE_CAN_PAY')),
        Pw.toPwCellDep(await this.provider.getCellDep('SECP256K1_BLAKE160')),
      ];
    }
    if (key === 'PW_NON_ANYONE_CAN_PAY') {
      return [
        Pw.toPwCellDep(await this.provider.getCellDep('PW_NON_ANYONE_CAN_PAY')),
        Pw.toPwCellDep(await this.provider.getCellDep('SECP256K1_BLAKE160')),
      ];
    }
    if (key === 'SECP256K1_BLAKE160') {
      return [Pw.toPwCellDep(await this.provider.getCellDep('SECP256K1_BLAKE160'))];
    }

    if (key === 'CHEQUE') {
      return [Pw.toPwCellDep(await this.provider.getCellDep('CHEQUE'))];
    }

    return [];
  }

  private async getCellDepByScript(script: Script): Promise<CellDep[]> {
    // typeid script has no deps
    if (script.code_hash === '0x00000000000000000000000000000000000000000000000000545950455f4944') return [];

    const keyToTemplate = () => {
      const foundEntry = Object.entries(this.provider.config.SCRIPTS).find(([, config]) => {
        return config.CODE_HASH === script.code_hash && config.HASH_TYPE === script.hash_type;
      });

      if (foundEntry) return foundEntry[0] as CkitConfigKeys;
      return undefined;
    };

    const key = keyToTemplate();
    if (!key) throw new Error(`Unknown script, code_hash: ${script.code_hash}, hash_type: ${script.hash_type}`);

    return await this.getCellDepByKey(key);
  }

  private async getCellDeps(scripts: Script[] = []): Promise<CellDep[]> {
    const promises: Promise<CellDep[]>[] = scripts.map((script) => this.getCellDepByScript(script));
    const resolved = await Promise.all(promises);
    return uniqWith(flatMap(resolved), (dep1, dep2) => dep1.sameWith(dep2));
  }

  protected async getCellDepsByCells(inputCells: Cell[], outputCells: Cell[]): Promise<CellDep[]> {
    const inputLockAndTypeScripts = inputCells.flatMap<Script>((cell) =>
      cell.type
        ? [cell.lock.serializeJson() as Script, cell.type.serializeJson() as Script]
        : [cell.lock.serializeJson() as Script],
    );

    const outputTypeScripts = outputCells.flatMap<Script>((cell) =>
      cell.type ? [cell.type.serializeJson() as Script] : [],
    );

    return await this.getCellDeps(inputLockAndTypeScripts.concat(outputTypeScripts));
  }

  // TODO refactor to ConfigManager
  protected getWitnessPlaceholder(address: string): WitnessArgs {
    const isTemplateOf = (key: CkitConfigKeys, address: Address): boolean => {
      const script = this.provider.parseToScript(address);
      const scriptConfig = this.provider.getScriptConfig(key);

      return scriptConfig.CODE_HASH === script.code_hash && scriptConfig.HASH_TYPE === script.hash_type;
    };

    if (isTemplateOf('SECP256K1_BLAKE160', address)) {
      return {
        lock: '0x' + '0'.repeat(130),
        input_type: '',
        output_type: '',
      };
    }

    if (isTemplateOf('PW_NON_ANYONE_CAN_PAY', address)) {
      return {
        lock: '0x' + '0'.repeat(132),
        input_type: '',
        output_type: '',
      };
    }

    if (isTemplateOf('PW_NON_ANYONE_CAN_PAY', address)) {
      return {
        lock: '0x' + '0'.repeat(132),
        input_type: '',
        output_type: '',
      };
    }

    if (isTemplateOf('ANYONE_CAN_PAY', address)) {
      return {
        lock: '0x' + '0'.repeat(130),
        input_type: '',
        output_type: '',
      };
    }

    if (isTemplateOf('UNIPASS', address)) {
      return {
        lock: '0x' + '0'.repeat(2082),
        input_type: '',
        output_type: '',
      };
    }

    if (isTemplateOf('RC_LOCK', address)) {
      const byteLength = SerializeRcLockWitnessLock({ signature: new Reader('0x' + '0'.repeat(130)) }).byteLength;
      return {
        lock: '0x' + '0'.repeat(byteLength * 2),
        input_type: '',
        output_type: '',
      };
    }

    boom(`Unsupported lock ${address}`);
  }
}
