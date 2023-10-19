import { UnipassWallet } from '@ckitjs/ckit';
import { useLocalStorage } from '@rehooks/local-storage';

interface UnipassContext {
  shouldLogin: boolean;
  cacheLogin: () => void;
  shouldSendTx: boolean;
  cacheTx: (tx: string | null) => void;
  clearTx: () => void;
  cachedTx: string | null;
  host: string;
}

export function useUnipass(): UnipassContext {
  const [cachedTx, cacheTx] = useLocalStorage<string | null>('unipassTx');
  // TODO unipass.xyz is deprecated, change it when the new host is ready
  const host = 'https://unipass.xyz';
  const adapter = new UnipassWallet.UnipassRedirectAdapter({ host }); // TODO  use the config
  return {
    shouldLogin: adapter.hasLoginInfo(),
    cacheLogin: () => adapter.saveLoginInfo(),
    shouldSendTx: adapter.hasSigData(),
    cacheTx,
    clearTx: () => cacheTx(null),
    cachedTx,
    host,
  };
}
