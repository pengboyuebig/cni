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
exports.Resolver = void 0;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
class Resolver {
    constructor(projectRoot, logger) {
        this.projectRoot = projectRoot;
        this.logger = logger;
    }
    /**
     * 从 package-lock.json 解析所有依赖
     * 返回扁平化的精确版本列表
     */
    async resolve(options) {
        const lockfilePath = path.join(this.projectRoot, 'package-lock.json');
        const pkgJsonPath = path.join(this.projectRoot, 'package.json');
        // 优先从 lockfile 解析
        if (await fse.pathExists(lockfilePath)) {
            return this.resolveFromLockfile(lockfilePath, options);
        }
        // 降级: 从 package.json 解析 (版本可能不是精确的)
        if (await fse.pathExists(pkgJsonPath)) {
            return this.resolveFromPackageJson(pkgJsonPath, options);
        }
        throw new Error('No package.json or package-lock.json found');
    }
    /**
     * 从 package-lock.json v2/v3 解析
     */
    async resolveFromLockfile(lockfilePath, options) {
        const lockfile = await fse.readJson(lockfilePath);
        const packages = lockfile.packages || {};
        const resolved = [];
        const seen = new Set();
        for (const [pkgPath, info] of Object.entries(packages)) {
            // 跳过根项目 ("")
            if (pkgPath === '')
                continue;
            // 只处理 node_modules/ 开头的顶层包
            if (!pkgPath.startsWith('node_modules/'))
                continue;
            // 跳过嵌套依赖 (node_modules/a/node_modules/b)
            if (pkgPath.split('node_modules/').length > 2)
                continue;
            const pkgName = this.extractPackageName(pkgPath);
            const key = `${pkgName}@${info.version}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            // 跳过 devDependencies (如果 --production)
            if (options?.production && this.isDevDependency(pkgName, lockfile)) {
                continue;
            }
            resolved.push({
                name: pkgName,
                version: info.version,
                integrity: info.integrity,
                resolved: info.resolved,
            });
        }
        this.logger?.debug(`Resolved ${resolved.length} packages from lockfile`);
        return resolved;
    }
    /**
     * 从 package.json 解析 (无 lockfile 时的降级方案)
     */
    async resolveFromPackageJson(pkgJsonPath, options) {
        const pkg = await fse.readJson(pkgJsonPath);
        const resolved = [];
        const deps = pkg.dependencies || {};
        const devDeps = options?.production ? {} : (pkg.devDependencies || {});
        const allDeps = { ...deps, ...devDeps };
        for (const [name, version] of Object.entries(allDeps)) {
            resolved.push({
                name,
                version: version,
                from: `${name}@${version}`,
            });
        }
        this.logger?.debug(`Resolved ${resolved.length} packages from package.json (no lockfile)`);
        return resolved;
    }
    /**
     * 解析命令行指定的包
     */
    async resolvePackages(specs) {
        return specs.map((spec) => {
            // 尝试解析 name@version 格式
            const match = spec.match(/^(.+?)(?:@(.+))?$/);
            if (!match) {
                throw new Error(`Invalid package spec: ${spec}`);
            }
            const name = match[1];
            const version = match[2] || 'latest';
            return {
                name,
                version,
                from: spec,
            };
        });
    }
    /**
     * 从 lockfile 路径提取包名
     * "node_modules/lodash" -> "lodash"
     * "node_modules/@babel/core" -> "@babel/core"
     */
    extractPackageName(pkgPath) {
        let name = pkgPath.replace(/^node_modules\//, '');
        // 嵌套依赖: "express/node_modules/cookie" -> 取最后一个
        if (name.includes('/node_modules/')) {
            name = name.split('/node_modules/').pop();
        }
        return name;
    }
    /**
     * 判断包是否是 devDependency
     */
    isDevDependency(pkgName, lockfile) {
        const rootPkg = lockfile.packages?.[''];
        if (!rootPkg)
            return false;
        const devDeps = rootPkg.devDependencies || {};
        return pkgName in devDeps;
    }
}
exports.Resolver = Resolver;
//# sourceMappingURL=resolver.js.map