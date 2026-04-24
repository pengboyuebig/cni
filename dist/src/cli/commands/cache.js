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
exports.registerCacheCommand = registerCacheCommand;
const fse = __importStar(require("fs-extra"));
const cache_manager_1 = require("../../core/cache-manager");
const config_manager_1 = require("../../config/config-manager");
const logger_1 = require("../../utils/logger");
function registerCacheCommand(program) {
    const cacheCmd = program.command('cache').description('缓存管理');
    // cni cache ls [pattern]
    const lsCmd = cacheCmd
        .command('ls [pattern]')
        .description('列出缓存包');
    lsCmd.action(async (pattern) => {
        const logger = new logger_1.Logger();
        const configManager = new config_manager_1.ConfigManager();
        const config = await configManager.load(process.cwd());
        const cacheManager = new cache_manager_1.CacheManager(config.store);
        const stats = await cacheManager.getStats();
        if (stats.packages.length === 0) {
            logger.info('Cache is empty');
            return;
        }
        const regex = pattern ? new RegExp(pattern, 'i') : null;
        for (const pkg of stats.packages) {
            if (regex && !regex.test(pkg.name))
                continue;
            for (const ver of pkg.versions) {
                const sizeStr = ver.size > 0 ? ` (${formatSize(ver.size)})` : '';
                const refCount = ver.requiredBy.length > 0 ? ` [${ver.requiredBy.length} refs]` : '';
                logger.plain(`  ${pkg.name}@${ver.version}${sizeStr}${refCount}`);
            }
        }
        logger.plain('');
        logger.info(`Total: ${stats.totalPackages} packages, ${stats.totalVersions} versions, ${formatSize(stats.totalSize)}`);
    });
    // cni cache clean [pattern]
    const cleanCmd = cacheCmd
        .command('clean [pattern]')
        .description('清理缓存')
        .option('--all', '清理所有缓存');
    cleanCmd.action(async (pattern) => {
        const opts = cleanCmd.opts();
        const logger = new logger_1.Logger();
        const configManager = new config_manager_1.ConfigManager();
        const config = await configManager.load(process.cwd());
        const cacheManager = new cache_manager_1.CacheManager(config.store);
        if (!pattern && !opts.all) {
            const result = await cacheManager.prune();
            logger.info(`Pruned ${result.removed} packages, freed ${formatSize(result.freedBytes)}`);
            return;
        }
        if (opts.all) {
            const storePath = config.store;
            if (await fse.pathExists(storePath)) {
                await fse.remove(storePath);
                logger.info('Cache cleared');
            }
            else {
                logger.info('Cache is already empty');
            }
            return;
        }
        // 按模式清理
        const stats = await cacheManager.getStats();
        const regex = new RegExp(pattern, 'i');
        let removed = 0;
        for (const pkg of stats.packages) {
            if (!regex.test(pkg.name))
                continue;
            for (const ver of pkg.versions) {
                await cacheManager.remove({ name: pkg.name, version: ver.version });
                removed++;
                logger.info(`Removed ${pkg.name}@${ver.version}`);
            }
        }
        logger.info(`Removed ${removed} versions`);
    });
    // cni cache stat
    const statCmd = cacheCmd
        .command('stat')
        .description('缓存统计信息');
    statCmd.action(async () => {
        const logger = new logger_1.Logger();
        const configManager = new config_manager_1.ConfigManager();
        const config = await configManager.load(process.cwd());
        const cacheManager = new cache_manager_1.CacheManager(config.store);
        const stats = await cacheManager.getStats();
        logger.plain(`Store path: ${config.store}`);
        logger.plain(`Packages:   ${stats.totalPackages}`);
        logger.plain(`Versions:   ${stats.totalVersions}`);
        logger.plain(`Total size: ${formatSize(stats.totalSize)}`);
    });
    // cni cache verify
    const verifyCmd = cacheCmd
        .command('verify')
        .description('校验所有缓存包完整性');
    verifyCmd.action(async () => {
        const logger = new logger_1.Logger();
        const configManager = new config_manager_1.ConfigManager();
        const config = await configManager.load(process.cwd());
        const cacheManager = new cache_manager_1.CacheManager(config.store);
        const stats = await cacheManager.getStats();
        let valid = 0;
        let invalid = 0;
        for (const pkg of stats.packages) {
            for (const ver of pkg.versions) {
                const ok = await cacheManager.verify({ name: pkg.name, version: ver.version });
                if (ok) {
                    valid++;
                }
                else {
                    invalid++;
                    logger.warn(`INVALID: ${pkg.name}@${ver.version}`);
                }
            }
        }
        logger.plain('');
        logger.info(`Verified: ${valid} valid, ${invalid} invalid`);
    });
}
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
//# sourceMappingURL=cache.js.map