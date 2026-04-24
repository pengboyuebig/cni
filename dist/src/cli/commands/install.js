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
exports.registerInstallCommand = registerInstallCommand;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const installer_1 = require("../../core/installer");
const downloader_1 = require("../../core/downloader");
const config_manager_1 = require("../../config/config-manager");
const logger_1 = require("../../utils/logger");
function registerInstallCommand(program) {
    const cmd = program
        .command('install [packages...]')
        .alias('i')
        .description('安装依赖')
        .option('--production', '仅安装 dependencies')
        .option('--save-dev', '保存为 devDependency')
        .option('-D', '保存为 devDependency (简写)')
        .option('--ignore-scripts', '跳过 lifecycle scripts')
        .option('--no-links', '仅下载不创建链接')
        .option('--store <path>', '缓存存储路径')
        .option('--registry <url>', 'npm registry 地址')
        .option('--verbose', '详细输出')
        .option('--force', '强制重新下载');
    cmd.action(async (packages) => {
        const opts = cmd.opts();
        const cwd = process.cwd();
        const logger = new logger_1.Logger(!!opts.verbose);
        const configManager = new config_manager_1.ConfigManager();
        const config = await configManager.load(cwd, {
            store: opts.store,
            registry: opts.registry,
        });
        // 如果指定了包名，解析版本并写入 package.json
        if (packages && packages.length > 0) {
            await ensurePackageJson(cwd, packages, {
                isDev: !!(opts.saveDev || opts.D),
                registry: config.registry,
                logger,
            });
        }
        const installer = new installer_1.Installer(cwd, config, logger);
        await installer.install(packages || [], {
            production: !!opts.production,
            ignoreScripts: !!opts.ignoreScripts,
            noLinks: opts.noLinks === false,
            force: !!opts.force,
            verbose: !!opts.verbose,
        });
    });
}
/**
 * 确保 package.json 存在，并将指定包写入 dependencies/devDependencies
 * 未指定版本时自动解析最新版本号
 */
async function ensurePackageJson(cwd, packages, options) {
    const pkgJsonPath = path.join(cwd, 'package.json');
    // 如果不存在则创建
    if (!(await fse.pathExists(pkgJsonPath))) {
        const pkgName = path.basename(cwd);
        const newPkg = {
            name: pkgName,
            version: '1.0.0',
            description: '',
            main: 'index.js',
            dependencies: {},
            devDependencies: {},
        };
        await fse.writeJson(pkgJsonPath, newPkg, { spaces: 2 });
        options.logger.info('Created package.json');
    }
    const pkgJson = await fse.readJson(pkgJsonPath);
    const depField = options.isDev ? 'devDependencies' : 'dependencies';
    if (!pkgJson[depField])
        pkgJson[depField] = {};
    const downloader = new downloader_1.Downloader({ registry: options.registry, logger: options.logger });
    let added = 0;
    for (const spec of packages) {
        // 从 spec 中提取包名和版本
        // 支持: lodash, lodash@4.17.21, @babel/core@7.24.0
        const match = spec.match(/^(@?[^@]+)(?:@(.+))?$/);
        if (match) {
            const name = match[1];
            const specifiedVersion = match[2];
            if (specifiedVersion) {
                // 有指定版本: 保持用户输入的格式
                pkgJson[depField][name] = specifiedVersion.startsWith('^') || specifiedVersion.startsWith('~')
                    ? specifiedVersion
                    : `^${specifiedVersion}`;
            }
            else {
                // 没有指定版本: 解析最新版本号
                try {
                    const resolved = await downloader.resolve(spec);
                    pkgJson[depField][name] = `^${resolved.version}`;
                    options.logger.debug(`Resolved ${name} latest: ${resolved.version}`);
                }
                catch (err) {
                    // 解析失败，回退到 latest
                    pkgJson[depField][name] = 'latest';
                    options.logger.warn(`Failed to resolve ${name} version, using "latest"`);
                }
            }
            added++;
        }
    }
    if (added > 0) {
        await fse.writeJson(pkgJsonPath, pkgJson, { spaces: 2 });
        options.logger.info(`Updated package.json (${added} → ${depField})`);
    }
}
//# sourceMappingURL=install.js.map