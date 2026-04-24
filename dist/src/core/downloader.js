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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Downloader = void 0;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const pacote_1 = __importDefault(require("pacote"));
const hash_1 = require("../utils/hash");
const platform_1 = require("../utils/platform");
class Downloader {
    constructor(options) {
        this.registry = options.registry;
        this.npmCache = options.cacheDir || (0, platform_1.getNpmCacheDir)();
        this.logger = options.logger;
    }
    /**
     * 下载包到指定目录
     * 使用 pacote 下载并解压，自动校验 integrity
     */
    async download(pkg, targetDir) {
        const spec = pkg.from || `${pkg.name}@${pkg.version}`;
        const pkgContentDir = path.join(targetDir, 'node_modules', pkg.name);
        this.logger?.debug(`Downloading ${spec}...`);
        // 确保 node_modules/<pkgName> 目录结构
        await fse.ensureDir(path.dirname(pkgContentDir));
        const pacoteOptions = {
            registry: this.registry,
            cache: this.npmCache,
            resolved: pkg.resolved,
            integrity: pkg.integrity,
        };
        // 下载并解压到 node_modules/<pkgName>/
        await pacote_1.default.extract(spec, pkgContentDir, pacoteOptions);
        // 获取 manifest 用于生成 metadata
        const manifest = await pacote_1.default.manifest(spec, {
            registry: this.registry,
            cache: this.npmCache,
        });
        // 计算包大小
        const size = await this.getDirectorySize(pkgContentDir);
        // 快速 shasum
        const shasum = await (0, hash_1.quickShasum)(pkgContentDir);
        const metadata = {
            name: manifest.name,
            version: manifest.version,
            integrity: manifest._integrity || pkg.integrity || '',
            resolved: manifest._resolved || pkg.resolved || '',
            shasum: manifest._shasum || shasum,
            installTime: Date.now(),
            size,
            requiredBy: [],
        };
        this.logger?.debug(`Downloaded ${manifest.name}@${manifest.version} (${this.formatSize(size)})`);
        return metadata;
    }
    /**
     * 解析包的精确版本
     */
    async resolve(spec) {
        const manifest = await pacote_1.default.manifest(spec, {
            registry: this.registry,
            cache: this.npmCache,
        });
        return {
            name: manifest.name,
            version: manifest.version,
            integrity: manifest._integrity,
            resolved: manifest._resolved,
            from: spec,
        };
    }
    /**
     * 计算目录大小
     */
    async getDirectorySize(dir) {
        let totalSize = 0;
        const entries = await fse.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                totalSize += await this.getDirectorySize(fullPath);
            }
            else if (entry.isFile()) {
                const stat = await fse.stat(fullPath);
                totalSize += stat.size;
            }
        }
        return totalSize;
    }
    /**
     * 格式化文件大小
     */
    formatSize(bytes) {
        if (bytes < 1024)
            return `${bytes}B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
}
exports.Downloader = Downloader;
//# sourceMappingURL=downloader.js.map