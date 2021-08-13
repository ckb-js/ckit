import { useLocalStorage } from '@rehooks/local-storage';

export function useCurrentWalletStorage(): [string | null, (newValue: string | null) => void, () => void] {
  return useLocalStorage<string | null>('currentWalletIndex');
}
