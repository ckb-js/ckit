import path from 'path';

export const PATH_PROJECT_ROOT = path.join(__dirname, '../../..');

export function pathFromProjectRoot(subPath: string): string {
  return path.join(PATH_PROJECT_ROOT, subPath);
}
