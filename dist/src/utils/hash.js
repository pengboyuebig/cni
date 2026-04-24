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
exports.quickShasum = quickShasum;
exports.computeIntegrity = computeIntegrity;
exports.checkIntegrity = checkIntegrity;
exports.fullDirectoryIntegrity = fullDirectoryIntegrity;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
/**
 * 计算目录的快速 shasum (基于 package.json 内容)
 */
async function quickShasum(packageDir) {
    const pkgJsonPath = path.join(packageDir, 'package.json');
    const content = await fse.readFile(pkgJsonPath);
    return crypto.createHash('sha1').update(content).digest('hex');
}
/**
 * 计算文件内容的 integrity (SHA-512)
 */
function computeIntegrity(data) {
    const hash = crypto.createHash('sha512').update(data).digest('base64');
    return `sha512-${hash}`;
}
/**
 * 校验 integrity 字符串是否匹配
 * 支持 sha512-xxx 和 sha1-xxx 格式
 */
function checkIntegrity(actual, expected) {
    if (!actual || !expected)
        return true; // 没有则跳过
    return actual === expected;
}
/**
 * 计算目录的完整 integrity
 * 遍历所有文件，按排序路径拼接后做 hash
 */
async function fullDirectoryIntegrity(packageDir) {
    const files = await listFilesRecursive(packageDir);
    files.sort();
    const hashes = [];
    for (const file of files) {
        const relativePath = path.relative(packageDir, file);
        const content = await fse.readFile(file);
        const hash = crypto
            .createHash('sha512')
            .update(content)
            .digest('base64');
        hashes.push(`${relativePath}:${hash}`);
    }
    return crypto
        .createHash('sha512')
        .update(hashes.join('\n'))
        .digest('base64');
}
/**
 * 递归列出目录下所有文件
 */
async function listFilesRecursive(dir) {
    const files = [];
    const entries = await fse.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listFilesRecursive(fullPath)));
        }
        else if (entry.isFile()) {
            files.push(fullPath);
        }
    }
    return files;
}
//# sourceMappingURL=hash.js.map