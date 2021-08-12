import { useLocalStorage } from '@rehooks/local-storage';

export function useWalletIndexStorage(): [number | null, (newValue: number | null) => void, () => void] {
  return useLocalStorage<number | null>('currentWalletIndex');
}
