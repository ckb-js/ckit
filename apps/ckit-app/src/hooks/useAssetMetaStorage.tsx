import { CkbTypeScript } from '@ckit/base';
import { useLocalStorage } from '@rehooks/local-storage';
import { randomHexString } from 'ckit/dist/utils';
import { useMemo } from 'react';

export interface AssetMeta {
  name: string;
  script?: CkbTypeScript;
  precision: number;
}

export function useAssetMetaStorage(): [AssetMeta[], (newValue: AssetMeta[]) => void, () => void] {
  const initialAssetMeta = useMemo<AssetMeta[]>(
    () => [
      { name: 'ckb', precision: 8 },
      {
        name: 'yyds',
        script: { code_hash: randomHexString(64), hash_type: 'data', args: randomHexString(64) },
        precision: 8,
      },
    ],
    [],
  );

  return useLocalStorage<AssetMeta[]>('assetMeta', initialAssetMeta);
}
