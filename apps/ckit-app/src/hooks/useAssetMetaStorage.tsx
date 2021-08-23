import { CkbTypeScript } from '@ckit/base';
import { useLocalStorage } from '@rehooks/local-storage';
import { useCallback, useMemo } from 'react';

export interface AssetMeta {
  symbol: string;
  decimal: number;
  script?: CkbTypeScript;
}

export function useAssetMetaStorage(): { assetsMeta: AssetMeta[]; addAssetMeta: (newValue: AssetMeta) => void } {
  const initialAssetMeta = useMemo<AssetMeta[]>(() => [{ symbol: 'ckb', decimal: 8 }], []);
  const [assetsMeta, setAssetsMeta] = useLocalStorage<AssetMeta[]>('assetMeta', initialAssetMeta);
  const addAssetMeta = useCallback(
    (newValue: AssetMeta) => {
      setAssetsMeta(assetsMeta.concat(newValue));
    },
    [assetsMeta, setAssetsMeta],
  );
  return { assetsMeta, addAssetMeta };
}
