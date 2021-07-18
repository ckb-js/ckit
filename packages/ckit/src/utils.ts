export function unimplemented(): never {
  throw new Error('unimplemented');
}

export function asyncSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
