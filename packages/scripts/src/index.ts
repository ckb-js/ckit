import path from 'path';

export const PATH_PROJECT_ROOT = path.join(__dirname, '../../..');

export function pathFromProjectRoot(subPath: string): string {
  return path.join(PATH_PROJECT_ROOT, subPath);
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
