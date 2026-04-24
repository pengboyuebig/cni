"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWindows = isWindows;
exports.getLinkType = getLinkType;
exports.getNpmCacheDir = getNpmCacheDir;
function isWindows() {
    return process.platform === 'win32';
}
function getLinkType() {
    return isWindows() ? 'junction' : 'symlink';
}
function getNpmCacheDir() {
    // npm 的 HTTP 缓存目录，pacote 会复用
    const home = process.env.APPDATA || process.env.HOME || '';
    return isWindows()
        ? `${home}/npm-cache`
        : `${home}/.npm`;
}
//# sourceMappingURL=platform.js.map