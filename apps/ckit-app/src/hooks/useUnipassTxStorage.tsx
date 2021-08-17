import { useLocalStorage } from '@rehooks/local-storage';

export function useUnipassTxStorage(): [string | null, (newValue: string | null) => void, () => void] {
  return useLocalStorage<string | null>('unipassTx');
}
