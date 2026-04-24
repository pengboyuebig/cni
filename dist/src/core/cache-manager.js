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
exports.CacheManager = void 0;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const defaults_1 = require("../config/defaults");
const hash_1 = require("../utils/hash");
class CacheManager {
    constructor(storeRoot) {
        this.storeRoot = storeRoot;
    }
    /**
     * 初始化 store 目录
     */
    async init() {
        await fse.ensureDir(this.storeRoot);
        const metadataPath = path.join(this.storeRoot, defaults_1.STORE_METADATA_FILE);
        if (!(await fse.pathExists(metadataPath))) {
            const metadata = {
                version: 1,
                createdAt: Date.now(),
                totalPackages: 0,
                totalVersions: 0,
                totalSize: 0,
                lastCleanup: Date.now(),
            };
            await fse.writeJson(metadataPath, metadata, { spaces: 2 });
        }
    }
    /**
     * 检查缓存是否命中
     */
    async has(pkg) {
        const cacheDir = this.getCachePath(pkg);
        const metadataPath = path.join(cacheDir, defaults_1.PACKAGE_METADATA_FILE);
        if (!(await fse.pathExists(cacheDir)))
            return false;
        if (!(await fse.pathExists(metadataPath)))
            return false;
        // 快速校验: package.json 存在
        const pkgPath = this.getPackageContentPath(pkg);
        if (!(await fse.pathExists(path.join(pkgPath, 'package.json'))))
            return false;
        // integrity 校验 (如果有)
        if (pkg.integrity) {
            try {
                const metadata = await fse.readJson(metadataPath);
                if (metadata.integrity && metadata.integrity !== pkg.integrity) {
                    return false;
                }
            }
            catch {
                return false;
            }
        }
        return true;
    }
    /**
     * 获取缓存目录路径: <storeRoot>/<pkgName>/<version>/
     */
    getCachePath(pkg) {
        return path.join(this.storeRoot, pkg.name, pkg.version);
    }
    /**
     * 获取缓存包内容路径: <storeRoot>/<pkgName>/<version>/node_modules/<pkgName>/
     */
    getPackageContentPath(pkg) {
        return path.join(this.getCachePath(pkg), 'node_modules', pkg.name);
    }
    /**
     * 写入缓存
     */
    async put(pkg, sourceDir, metadata) {
        const cacheDir = this.getCachePath(pkg);
        // 如果已存在（并发场景），跳过
        if (await fse.pathExists(cacheDir))
            return;
        // 确保父目录存在
        await fse.ensureDir(path.dirname(cacheDir));
        // 原子移动: sourceDir -> cacheDir
        await fse.move(sourceDir, cacheDir, { overwrite: false });
        // 写入 metadata
        const metadataPath = path.join(cacheDir, defaults_1.PACKAGE_METADATA_FILE);
        await fse.writeJson(metadataPath, metadata, { spaces: 2 });
        // 更新全局 metadata
        await this.updateStoreMetadata();
    }
    /**
     * 添加项目引用
     */
    async addReference(pkg, projectRoot) {
        const metadataPath = path.join(this.getCachePath(pkg), defaults_1.PACKAGE_METADATA_FILE);
        if (!(await fse.pathExists(metadataPath)))
            return;
        try {
            const metadata = await fse.readJson(metadataPath);
            if (!metadata.requiredBy.includes(projectRoot)) {
                metadata.requiredBy.push(projectRoot);
                await fse.writeJson(metadataPath, metadata, { spaces: 2 });
            }
        }
        catch {
            // 忽略
        }
    }
    /**
     * 移除项目引用
     */
    async removeReference(pkg, projectRoot) {
        const metadataPath = path.join(this.getCachePath(pkg), defaults_1.PACKAGE_METADATA_FILE);
        if (!(await fse.pathExists(metadataPath)))
            return;
        try {
            const metadata = await fse.readJson(metadataPath);
            metadata.requiredBy = metadata.requiredBy.filter((p) => p !== projectRoot);
            await fse.writeJson(metadataPath, metadata, { spaces: 2 });
        }
        catch {
            // 忽略
        }
    }
    /**
     * 删除指定版本的缓存
     */
    async remove(pkg) {
        const cacheDir = this.getCachePath(pkg);
        await fse.remove(cacheDir);
        await this.updateStoreMetadata();
    }
    /**
     * 校验缓存包完整性 (快速)
     */
    async verify(pkg) {
        const cacheDir = this.getCachePath(pkg);
        const pkgPath = this.getPackageContentPath(pkg);
        const metadataPath = path.join(cacheDir, defaults_1.PACKAGE_METADATA_FILE);
        if (!(await fse.pathExists(cacheDir)))
            return false;
        if (!(await fse.pathExists(metadataPath)))
            return false;
        if (!(await fse.pathExists(path.join(pkgPath, 'package.json'))))
            return false;
        try {
            const metadata = await fse.readJson(metadataPath);
            // shasum 快速校验
            if (metadata.shasum) {
                const currentShasum = await (0, hash_1.quickShasum)(pkgPath);
                if (currentShasum !== metadata.shasum)
                    return false;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 获取缓存统计信息
     */
    async getStats() {
        const stats = {
            totalPackages: 0,
            totalVersions: 0,
            totalSize: 0,
            packages: [],
        };
        if (!(await fse.pathExists(this.storeRoot)))
            return stats;
        const pkgDirs = await fse.readdir(this.storeRoot);
        for (const pkgDir of pkgDirs) {
            const pkgPath = path.join(this.storeRoot, pkgDir);
            if (!(await fse.stat(pkgPath)).isDirectory())
                continue;
            if (pkgDir.startsWith('_'))
                continue; // 跳过 _metadata.json 等
            // 处理 scope 包: @scope
            if (pkgDir.startsWith('@')) {
                const scopeDirs = await fse.readdir(pkgPath);
                for (const scopeDir of scopeDirs) {
                    const scopePath = path.join(pkgPath, scopeDir);
                    if (!(await fse.stat(scopePath)).isDirectory())
                        continue;
                    const fullName = `${pkgDir}/${scopeDir}`;
                    const pkgStats = await this.collectPackageStats(fullName, scopePath);
                    if (pkgStats.versions.length > 0) {
                        stats.packages.push(pkgStats);
                        stats.totalPackages++;
                    }
                }
            }
            else {
                const pkgStats = await this.collectPackageStats(pkgDir, pkgPath);
                if (pkgStats.versions.length > 0) {
                    stats.packages.push(pkgStats);
                    stats.totalPackages++;
                }
            }
        }
        return stats;
    }
    /**
     * 清理无引用的缓存包
     */
    async prune() {
        let removed = 0;
        let freedBytes = 0;
        const stats = await this.getStats();
        for (const pkg of stats.packages) {
            for (const ver of pkg.versions) {
                // 检查所有引用项目是否仍存在
                const aliveRefs = ver.requiredBy.filter((p) => fse.pathExistsSync(p));
                if (aliveRefs.length === 0 && ver.requiredBy.length > 0) {
                    // 无活引用，可以清理
                    const resolvedPkg = {
                        name: pkg.name,
                        version: ver.version,
                    };
                    freedBytes += ver.size;
                    await this.remove(resolvedPkg);
                    removed++;
                }
            }
        }
        return { removed, freedBytes };
    }
    /**
     * 获取临时下载目录
     */
    getTmpDir(pkg) {
        return path.join(this.storeRoot, '.tmp', `${pkg.name.replace(/[\/\\]/g, '_')}-${pkg.version}`);
    }
    /**
     * 清理临时目录
     */
    async cleanTmp() {
        const tmpDir = path.join(this.storeRoot, '.tmp');
        await fse.remove(tmpDir);
    }
    async collectPackageStats(name, pkgPath) {
        const result = { name, versions: [] };
        const versionDirs = await fse.readdir(pkgPath);
        for (const version of versionDirs) {
            const versionPath = path.join(pkgPath, version);
            if (!(await fse.stat(versionPath)).isDirectory())
                continue;
            const metadataPath = path.join(versionPath, defaults_1.PACKAGE_METADATA_FILE);
            if (!(await fse.pathExists(metadataPath)))
                continue;
            try {
                const metadata = await fse.readJson(metadataPath);
                result.versions.push({
                    version: metadata.version,
                    size: metadata.size,
                    installTime: metadata.installTime,
                    requiredBy: metadata.requiredBy || [],
                });
            }
            catch {
                result.versions.push({
                    version,
                    size: 0,
                    installTime: 0,
                    requiredBy: [],
                });
            }
        }
        return result;
    }
    async updateStoreMetadata() {
        const stats = await this.getStats();
        const metadataPath = path.join(this.storeRoot, defaults_1.STORE_METADATA_FILE);
        let storeMeta;
        if (await fse.pathExists(metadataPath)) {
            storeMeta = await fse.readJson(metadataPath);
        }
        else {
            storeMeta = { version: 1, createdAt: Date.now(), totalPackages: 0, totalVersions: 0, totalSize: 0, lastCleanup: 0 };
        }
        storeMeta.totalPackages = stats.totalPackages;
        storeMeta.totalVersions = stats.packages.reduce((sum, p) => sum + p.versions.length, 0);
        storeMeta.totalSize = stats.packages.reduce((sum, p) => sum + p.versions.reduce((s, v) => s + v.size, 0), 0);
        await fse.writeJson(metadataPath, storeMeta, { spaces: 2 });
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=cache-manager.js.map