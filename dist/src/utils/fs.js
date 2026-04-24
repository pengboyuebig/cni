"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPackageLink = createPackageLink;
exports.isLink = isLink;
exports.readLink = readLink;
exports.validateLink = validateLink;
exports.removeLink = removeLink;
exports.canCreateJunction = canCreateJunction;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const platform_1 = require("./platform");
/**
 * 创建包链接 (junction 或 symlink)
 */
async function createPackageLink(target, linkPath) {
    // 确保目标路径为绝对路径
    const absoluteTarget = path.resolve(target);
    if ((0, platform_1.isWindows)()) {
        // Windows: 使用 junction (目录联接)
        // 不需要管理员权限，只能用于目录
        try {
            await fs.promises.symlink(absoluteTarget, linkPath, 'junction');
            return 'junction';
        }
        catch (err) {
            // junction 失败，回退到硬拷贝
            return await fallbackCopy(absoluteTarget, linkPath);
        }
    }
    else {
        // POSIX: 使用相对路径 symlink
        const relativeTarget = path.relative(path.dirname(linkPath), absoluteTarget);
        try {
            await fs.promises.symlink(relativeTarget, linkPath);
            return 'symlink';
        }
        catch (err) {
            // symlink 失败，回退到硬拷贝
            return await fallbackCopy(absoluteTarget, linkPath);
        }
    }
}
/**
 * 回退到硬拷贝
 */
async function fallbackCopy(target, linkPath) {
    await fse.copy(target, linkPath);
    return 'copy';
}
/**
 * 检查路径是否为链接 (junction/symlink)
 */
async function isLink(pkgPath) {
    try {
        const stat = await fs.promises.lstat(pkgPath);
        return stat.isSymbolicLink();
    }
    catch {
        return false;
    }
}
/**
 * 读取链接目标
 */
async function readLink(linkPath) {
    try {
        return await fs.promises.readlink(linkPath);
    }
    catch {
        return null;
    }
}
/**
 * 验证链接是否有效 (目标是否存在)
 */
async function validateLink(linkPath) {
    try {
        const target = await fs.promises.readlink(linkPath);
        const resolved = path.resolve(path.dirname(linkPath), target);
        return fse.pathExists(resolved);
    }
    catch {
        return false;
    }
}
/**
 * 安全移除链接 (不删除缓存源)
 */
async function removeLink(linkPath) {
    try {
        const stat = await fs.promises.lstat(linkPath);
        if (stat.isSymbolicLink()) {
            await fs.promises.unlink(linkPath);
        }
        else if (stat.isDirectory()) {
            // 非 symlink 目录，可能是硬拷贝或原始 npm 安装
            await fse.remove(linkPath);
        }
    }
    catch {
        // 文件不存在，忽略
    }
}
/**
 * 检测 junction 在当前 Windows 环境下是否可用
 */
async function canCreateJunction(testDir) {
    if (!(0, platform_1.isWindows)())
        return false;
    const testTarget = path.join(testDir, '_cni_junction_test_target');
    const testLink = path.join(testDir, '_cni_junction_test_link');
    try {
        await fse.ensureDir(testTarget);
        await fs.promises.symlink(testTarget, testLink, 'junction');
        const stat = await fs.promises.lstat(testLink);
        await fse.remove(testLink);
        await fse.remove(testTarget);
        return stat.isSymbolicLink();
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=fs.js.map