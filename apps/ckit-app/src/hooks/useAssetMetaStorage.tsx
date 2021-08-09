import { CkbTypeScript } from '@ckit/base';
import { useLocalStorage } from '@rehooks/local-storage';
import { useMemo } from 'react';

export interface AssetMeta {
  symbol: string;
  decimal: number;
  script?: CkbTypeScript;
}

export function useAssetMetaStorage(): [AssetMeta[], (newValue: AssetMeta[]) => void, () => void] {
  const initialAssetMeta = useMemo<AssetMeta[]>(() => [{ symbol: 'ckb', decimal: 8 }], []);
  return useLocalStorage<AssetMeta[]>('assetMeta', initialAssetMeta);
}
