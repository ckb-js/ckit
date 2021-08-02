export function hasProp<O, K extends string | number | symbol>(obj: O, key: K): obj is Record<K, unknown> & O {
  return obj != null && typeof obj === 'object' && key in obj;
}
