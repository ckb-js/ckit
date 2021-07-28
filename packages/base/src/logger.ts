import { default as create, Debugger } from 'debug';

export function createDebugger(namespace: string): Debugger {
  if (!namespace.startsWith('ckit-')) namespace = 'ckit-' + namespace;
  return create(namespace);
}

export const debug = create('ckit');
