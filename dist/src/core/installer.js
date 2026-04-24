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
exports.Installer = void 0;
const fse = __importStar(require("fs-extra"));
const cache_manager_1 = require("./cache-manager");
const downloader_1 = require("./downloader");
const resolver_1 = require("./resolver");
const linker_1 = require("./linker");
const logger_1 = require("../utils/logger");
const npm_1 = require("../utils/npm");
class Installer {
    constructor(projectRoot, config, logger) {
        this.projectRoot = projectRoot;
        this.config = config;
        this.logger = logger || new logger_1.Logger();
        this.cacheManager = new cache_manager_1.CacheManager(config.store);
        this.downloader = new downloader_1.Downloader({
            registry: config.registry,
            logger: this.logger,
        });
        this.resolver = new resolver_1.Resolver(projectRoot, this.logger);
        this.linker = new linker_1.Linker(projectRoot, config.store, this.logger);
    }
    /**
     * 安装依赖 - 主入口
     */
    async install(packages, options = {}) {
        const startTime = Date.now();
        this.logger.setVerbose(!!options.verbose);
        // 初始化缓存目录
        await this.cacheManager.init();
        // ─── 阶段 1: 解析依赖 ───
        this.logger.heading('Resolving dependencies...');
        let resolved;
        if (packages.length > 0) {
            // 命令行指定包: 先解析精确版本 (通过 pacote)
            resolved = [];
            for (const spec of packages) {
                try {
                    const pkg = await this.downloader.resolve(spec);
                    resolved.push(pkg);
                }
                catch (err) {
                    this.logger.error(`Failed to resolve ${spec}: ${err.message}`);
                    throw err;
                }
            }
        }
        else {
            resolved = await this.resolver.resolve(options);
        }
        if (resolved.length === 0) {
            this.logger.info('No packages to install');
            return;
        }
        this.logger.info(`Found ${resolved.length} packages`);
        // ─── 阶段 2: 生成安装计划 ───
        this.logger.heading('Cache check...');
        const plan = await this.buildInstallPlan(resolved, options);
        for (const pkg of plan.hits) {
            this.logger.success(`${pkg.name}@${pkg.version} (cached)`);
        }
        for (const pkg of plan.misses) {
            this.logger.info(`${pkg.name}@${pkg.version} (miss)`);
        }
        // ─── 阶段 3: 下载缺失的包 ───
        let failed = 0;
        if (plan.misses.length > 0) {
            this.logger.heading(`Downloading ${plan.misses.length} packages...`);
            for (const pkg of plan.misses) {
                try {
                    await this.downloadAndCache(pkg);
                    this.logger.success(`${pkg.name}@${pkg.version} downloaded → cached`);
                }
                catch (err) {
                    this.logger.error(`Failed to download ${pkg.name}@${pkg.version}: ${err.message}`);
                    failed++;
                }
            }
        }
        // ─── 阶段 4: 创建链接 ───
        if (!options.noLinks) {
            this.logger.heading('Linking packages...');
            const linkablePkgs = [...plan.hits, ...plan.misses].filter((pkg) => !plan.misses.some((m) => m.name === pkg.name && m.version === pkg.version && failed > 0));
            const results = await this.linker.linkAll(linkablePkgs);
            const linked = results.filter((r) => r.status === 'linked').length;
            const copied = results.filter((r) => r.status === 'copy').length;
            const skipped = results.filter((r) => r.status === 'skipped').length;
            this.logger.info(`Linked: ${linked}, Copied (fallback): ${copied}, Skipped: ${skipped}`);
            // ─── 阶段 5: 更新引用 ───
            for (const pkg of linkablePkgs) {
                await this.cacheManager.addReference(pkg, this.projectRoot);
            }
        }
        // ─── 阶段 6: 生命周期脚本 ───
        if (this.config.runScripts && !options.ignoreScripts) {
            this.logger.debug('Running lifecycle scripts...');
            const allPkgs = [...plan.hits, ...plan.misses];
            for (const pkg of allPkgs) {
                const pkgPath = this.linker.getCachePackagePath(pkg);
                if (await fse.pathExists(pkgPath)) {
                    await (0, npm_1.runLifecycleScript)(pkgPath, 'postinstall', this.logger);
                }
            }
        }
        // ─── 输出摘要 ───
        const elapsed = Date.now() - startTime;
        this.logger.summary(plan.hits.length, plan.misses.length - failed, failed, elapsed);
    }
    /**
     * 构建安装计划
     */
    async buildInstallPlan(packages, options) {
        const hits = [];
        const misses = [];
        for (const pkg of packages) {
            if (!options.force && (await this.cacheManager.has(pkg))) {
                hits.push(pkg);
            }
            else {
                misses.push(pkg);
            }
        }
        return { packages, hits, misses };
    }
    /**
     * 下载包并写入缓存
     */
    async downloadAndCache(pkg) {
        const tmpDir = this.cacheManager.getTmpDir(pkg);
        try {
            // 清理临时目录
            await fse.remove(tmpDir);
            await fse.ensureDir(tmpDir);
            // 下载
            const metadata = await this.downloader.download(pkg, tmpDir);
            // 写入缓存
            await this.cacheManager.put(pkg, tmpDir, metadata);
        }
        finally {
            // 清理临时目录
            await fse.remove(tmpDir);
        }
    }
}
exports.Installer = Installer;
//# sourceMappingURL=installer.js.map