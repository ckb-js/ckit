import { useLocalStorage } from '@rehooks/local-storage';
import { CkitInitOptions, predefined } from 'ckit';
import { useMemo } from 'react';

export interface LocalConfig {
  ckitConfig: CkitInitOptions;
  mecuryRPC: string;
  ckbRPC: string;
  nervosExploreTxUrlPrefix: string;
  nervosExploreAddressUrlPrefix: string;
}

// TODO remove random when predefined config is ready
export function useConfigStorage(): [LocalConfig, (newValue: LocalConfig) => void, () => void] {
  const initialConfig = useMemo<LocalConfig>(() => {
    // TODO check network first
    const ckitConfig: CkitInitOptions = predefined.Aggron;
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
