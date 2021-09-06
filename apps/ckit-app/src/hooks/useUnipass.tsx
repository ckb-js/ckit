import { UnipassWallet } from '@ckitjs/ckit';
import { useLocalStorage } from '@rehooks/local-storage';

interface UnipassContext {
  shouldLogin: boolean;
  cacheLogin: () => void;
  shouldSendTx: boolean;
  cacheTx: (tx: string | null) => void;
  clearTx: () => void;
  cachedTx: string | null;
}

export function useUnipass(): UnipassContext {
  const [cachedTx, cacheTx] = useLocalStorage<string | null>('unipassTx');
  const adapter = new UnipassWallet.UnipassRedirectAdapter({ host: 'https://unipass.xyz' }); // TODO  use the config
  return {
    shouldLogin: adapter.hasLoginInfo(),
    cacheLogin: () => adapter.saveLoginInfo(),
    shouldSendTx: adapter.hasSigData(),
    cacheTx,
    clearTx: () => cacheTx(null),
    cachedTx,
  };
}
