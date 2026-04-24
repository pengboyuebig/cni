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
exports.Linker = void 0;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const fs_1 = require("../utils/fs");
class Linker {
    constructor(projectRoot, storeRoot, logger) {
        this.projectRoot = projectRoot;
        this.storeRoot = storeRoot;
        this.logger = logger;
    }
    /**
     * 为所有包创建链接到 node_modules
     */
    async linkAll(packages) {
        const results = [];
        const nodeModules = path.join(this.projectRoot, 'node_modules');
        // 确保 node_modules 目录存在
        await fse.ensureDir(nodeModules);
        for (const pkg of packages) {
            results.push(await this.link(pkg));
        }
        return results;
    }
    /**
     * 为单个包创建链接
     */
    async link(pkg) {
        const target = this.getCachePackagePath(pkg);
        const linkPath = this.getNodeModulesPath(pkg);
        // 检查目标是否存在于缓存
        if (!(await fse.pathExists(target))) {
            this.logger?.warn(`Cache target not found: ${target}`);
            return {
                name: pkg.name,
                version: pkg.version,
                linkPath,
                target,
                status: 'skipped',
            };
        }
        // 如果 linkPath 已存在
        if (await fse.pathExists(linkPath)) {
            const isExistingLink = await (0, fs_1.isLink)(linkPath);
            if (isExistingLink) {
                // 已有链接，检查目标是否一致
                const currentTarget = await (0, fs_1.readLink)(linkPath);
                const resolvedCurrent = currentTarget
                    ? path.resolve(path.dirname(linkPath), currentTarget)
                    : null;
                if (resolvedCurrent === path.resolve(target)) {
                    // 链接目标一致，跳过
                    return {
                        name: pkg.name,
                        version: pkg.version,
                        linkPath,
                        target,
                        status: 'skipped',
                    };
                }
                // 目标不一致，移除旧链接
                this.logger?.debug(`Removing stale link for ${pkg.name}`);
                await (0, fs_1.removeLink)(linkPath);
            }
            else {
                // 是普通目录 (npm 原始安装的)，需要移除
                this.logger?.debug(`Replacing existing directory for ${pkg.name}`);
                await fse.remove(linkPath);
            }
        }
        // 确保 scope 包的父目录存在 (@scope/)
        if (pkg.name.startsWith('@')) {
            const scopeDir = path.dirname(linkPath);
            await fse.ensureDir(scopeDir);
        }
        // 创建链接
        const linkType = await (0, fs_1.createPackageLink)(target, linkPath);
        return {
            name: pkg.name,
            version: pkg.version,
            linkPath,
            target,
            status: linkType === 'copy' ? 'copy' : 'linked',
        };
    }
    /**
     * 移除包链接
     */
    async unlink(pkgName) {
        const linkPath = path.join(this.projectRoot, 'node_modules', pkgName);
        await (0, fs_1.removeLink)(linkPath);
    }
    /**
     * 获取缓存中的包路径
     */
    getCachePackagePath(pkg) {
        return path.join(this.storeRoot, pkg.name, pkg.version, 'node_modules', pkg.name);
    }
    /**
     * 获取 node_modules 中的目标路径
     */
    getNodeModulesPath(pkg) {
        return path.join(this.projectRoot, 'node_modules', pkg.name);
    }
    /**
     * 清理 node_modules 中所有 cni 创建的链接
     */
    async unlinkAll(packages) {
        for (const pkg of packages) {
            await this.unlink(pkg.name);
        }
    }
}
exports.Linker = Linker;
//# sourceMappingURL=linker.js.map