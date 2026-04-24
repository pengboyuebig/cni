"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInstallCommand = registerInstallCommand;
const installer_1 = require("../../core/installer");
const config_manager_1 = require("../../config/config-manager");
const logger_1 = require("../../utils/logger");
function registerInstallCommand(program) {
    const cmd = program
        .command('install [packages...]')
        .alias('i')
        .description('安装依赖')
        .option('--production', '仅安装 dependencies')
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
//# sourceMappingURL=install.js.map