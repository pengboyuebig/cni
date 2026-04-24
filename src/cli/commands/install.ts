import * as path from 'path';
import { Command } from 'commander';
import { Installer } from '../../core/installer';
import { ConfigManager } from '../../config/config-manager';
import { Logger } from '../../utils/logger';

export function registerInstallCommand(program: Command): void {
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

  cmd.action(async (packages: string[]) => {
    const opts = cmd.opts();
    const cwd = process.cwd();
    const logger = new Logger(!!opts.verbose);

    const configManager = new ConfigManager();
    const config = await configManager.load(cwd, {
      store: opts.store,
      registry: opts.registry,
    });

    const installer = new Installer(cwd, config, logger);
    await installer.install(packages || [], {
      production: !!opts.production,
      ignoreScripts: !!opts.ignoreScripts,
      noLinks: opts.noLinks === false,
      force: !!opts.force,
      verbose: !!opts.verbose,
    });
  });
}
