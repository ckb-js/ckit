export * from './AssetAmount';

export function hasProp<O, K extends string | number | symbol>(obj: O, key: K): obj is Record<K, unknown> & O {
  return obj != null && typeof obj === 'object' && key in obj;
}

export function truncateMiddle(str: string, start: number, end = start): string {
  if (!start || !end || start <= 0 || end <= 0) throw new Error('start or end is invalid');
  if (str.length <= start + end) return str;
  return str.slice(0, start) + '...' + str.slice(-end);
}
