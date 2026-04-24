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
exports.registerHookCommand = registerHookCommand;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const config_manager_1 = require("../../config/config-manager");
const defaults_1 = require("../../config/defaults");
const logger_1 = require("../../utils/logger");
function registerHookCommand(program) {
    const hookCmd = program.command('hook').description('npm hook 管理');
    // cni hook install
    hookCmd
        .command('install')
        .description('安装 npm preinstall hook')
        .action(async () => {
        const logger = new logger_1.Logger();
        const cwd = process.cwd();
        const pkgJsonPath = path.join(cwd, 'package.json');
        if (!(await fse.pathExists(pkgJsonPath))) {
            logger.error('No package.json found in current directory');
            return;
        }
        const pkg = await fse.readJson(pkgJsonPath);
        if (!pkg.scripts)
            pkg.scripts = {};
        if (pkg.scripts.preinstall && pkg.scripts.preinstall.includes('cni')) {
            logger.info('Hook already installed');
            return;
        }
        if (pkg.scripts.preinstall) {
            pkg.scripts.preinstall = `cni hook-run && ${pkg.scripts.preinstall}`;
        }
        else {
            pkg.scripts.preinstall = 'cni hook-run';
        }
        await fse.writeJson(pkgJsonPath, pkg, { spaces: 2 });
        logger.success('npm preinstall hook installed');
    });
    // cni hook uninstall
    hookCmd
        .command('uninstall')
        .description('卸载 npm preinstall hook')
        .action(async () => {
        const logger = new logger_1.Logger();
        const cwd = process.cwd();
        const pkgJsonPath = path.join(cwd, 'package.json');
        if (!(await fse.pathExists(pkgJsonPath))) {
            logger.error('No package.json found in current directory');
            return;
        }
        const pkg = await fse.readJson(pkgJsonPath);
        if (pkg.scripts?.preinstall) {
            pkg.scripts.preinstall = pkg.scripts.preinstall
                .replace(/cni hook-run\s*&&?\s*/g, '')
                .trim();
            if (!pkg.scripts.preinstall) {
                delete pkg.scripts.preinstall;
            }
            await fse.writeJson(pkgJsonPath, pkg, { spaces: 2 });
            logger.success('npm preinstall hook uninstalled');
        }
        else {
            logger.info('No hook found');
        }
    });
    // cni hook-run (由 npm preinstall 调用)
    hookCmd
        .command('hook-run')
        .description('运行 preinstall hook (由 npm 自动调用)')
        .action(async () => {
        // 防止递归
        if (process.env[defaults_1.CNI_ACTIVE_ENV])
            return;
        const logger = new logger_1.Logger();
        const cwd = process.cwd();
        try {
            process.env[defaults_1.CNI_ACTIVE_ENV] = '1';
            const configManager = new config_manager_1.ConfigManager();
            const config = await configManager.load(cwd);
            const { Installer } = await Promise.resolve().then(() => __importStar(require('../../core/installer')));
            const installer = new Installer(cwd, config, logger);
            await installer.install([], {
                ignoreScripts: true, // hook 模式下不运行脚本，避免递归
                hookMode: true,
            });
            // 创建标记文件
            const fse = await Promise.resolve().then(() => __importStar(require('fs-extra')));
            await fse.ensureDir(path.join(cwd, 'node_modules'));
            await fse.writeFile(path.join(cwd, 'node_modules', '.cni-done'), Date.now().toString());
        }
        catch (err) {
            // hook 失败不阻断 npm 正常安装
            logger.warn(`cni hook failed, falling back to npm: ${err.message}`);
        }
        finally {
            delete process.env[defaults_1.CNI_ACTIVE_ENV];
        }
    });
}
//# sourceMappingURL=hook.js.map