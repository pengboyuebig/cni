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
exports.registerAddCommand = registerAddCommand;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const installer_1 = require("../../core/installer");
const config_manager_1 = require("../../config/config-manager");
const logger_1 = require("../../utils/logger");
function registerAddCommand(program) {
    const cmd = program
        .command('add <packages...>')
        .alias('a')
        .description('添加并安装新依赖')
        .option('--save-dev', '保存为 devDependency')
        .option('-D', '保存为 devDependency (简写)')
        .option('--ignore-scripts', '跳过 lifecycle scripts')
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
        const installer = new installer_1.Installer(cwd, config, logger);
        await installer.install(packages, {
            ignoreScripts: !!opts.ignoreScripts,
            force: !!opts.force,
            verbose: !!opts.verbose,
        });
        // 更新 package.json
        const pkgJsonPath = path.join(cwd, 'package.json');
        if (await fse.pathExists(pkgJsonPath)) {
            const pkgJson = await fse.readJson(pkgJsonPath);
            const isDev = !!(opts.saveDev || opts.D);
            const depField = isDev ? 'devDependencies' : 'dependencies';
            if (!pkgJson[depField])
                pkgJson[depField] = {};
            for (const spec of packages) {
                const match = spec.match(/^(.+?)(?:@(.+))?$/);
                if (match) {
                    const name = match[1];
                    const version = match[2] || 'latest';
                    pkgJson[depField][name] = version.startsWith('^') || version === 'latest'
                        ? `^${version === 'latest' ? '' : version}`
                        : version;
                }
            }
            await fse.writeJson(pkgJsonPath, pkgJson, { spaces: 2 });
            logger.info(`Updated package.json (${depField})`);
        }
    });
}
//# sourceMappingURL=add.js.map