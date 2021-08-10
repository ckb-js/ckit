import { CkbTypeScript } from '@ckit/base';
import { useLocalStorage } from '@rehooks/local-storage';
import { useMemo } from 'react';

export interface AssetMeta {
  name: string;
  script?: CkbTypeScript;
  precision: number;
}

// TODO use real assets meta data
export function useAssetMetaStorage(): [AssetMeta[], (newValue: AssetMeta[]) => void, () => void] {
  const initialAssetMeta = useMemo<AssetMeta[]>(
    () => [
      { name: 'ckb', precision: 8 },
      {
        name: 'yyds',
        script: {
          code_hash: '0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4',
          args: '0x537461ee3e5ebd77ad6bd325e1ff152f298b09453a158a51ebaeaea681499e84',
          hash_type: 'type',
        },
        precision: 8,
      },
    ],
    [],
  );

  return useLocalStorage<AssetMeta[]>('assetMeta', initialAssetMeta);
}
