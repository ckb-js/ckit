import { ScriptConfig } from '@ckb-lumos/config-manager';
import { useLocalStorage } from '@rehooks/local-storage';
import { CkitConfig } from 'ckit';
import { randomHexString } from 'ckit/dist/utils';
import { useMemo } from 'react';

export interface LocalConfig {
  ckitConfig: CkitConfig;
  mecuryRPC: string;
  ckbRPC: string;
  nervosExploreTxUrlPrefix: string;
  nervosExploreAddressUrlPrefix: string;
}

export function useConfigStorage(): [LocalConfig, (newValue: LocalConfig) => void, () => void] {
  const initialConfig = useMemo<LocalConfig>(() => {
    const randomScriptConfig = (): ScriptConfig => ({
      HASH_TYPE: 'type',
      DEP_TYPE: 'code',
      CODE_HASH: randomHexString(64),
      TX_HASH: randomHexString(64),
      INDEX: '0x0',
    });

    const ckitConfig: CkitConfig = {
      PREFIX: 'ckt',
      SCRIPTS: {
        ANYONE_CAN_PAY: randomScriptConfig(),
        PW_NON_ANYONE_CAN_PAY: randomScriptConfig(),
        PW_ANYONE_CAN_PAY: randomScriptConfig(),
        SECP256K1_BLAKE160: randomScriptConfig(),
        SUDT: randomScriptConfig(),
      },
    };
    const mecuryRPC = 'http://127.0.0.1:8116';
    const ckbRPC = 'http://127.0.0.1:8114';
    const nervosExploreTxUrlPrefix = 'https://explorer.nervos.org/aggron/transaction/';
    const nervosExploreAddressUrlPrefix = 'https://explorer.nervos.org/aggron/address/';
    return {
      ckitConfig: ckitConfig,
      mecuryRPC: mecuryRPC,
      ckbRPC: ckbRPC,
      nervosExploreTxUrlPrefix: nervosExploreTxUrlPrefix,
      nervosExploreAddressUrlPrefix: nervosExploreAddressUrlPrefix,
    };
  }, []);

  return useLocalStorage<LocalConfig>('localConfig', initialConfig);
}
