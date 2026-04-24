export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function getLinkType(): 'junction' | 'symlink' {
  return isWindows() ? 'junction' : 'symlink';
}

export function getNpmCacheDir(): string {
  // npm 的 HTTP 缓存目录，pacote 会复用
  const home = process.env.APPDATA || process.env.HOME || '';
  return isWindows()
    ? `${home}/npm-cache`
    : `${home}/.npm`;
}
