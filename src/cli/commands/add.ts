import * as path from 'path';
import * as fse from 'fs-extra';
import { Command } from 'commander';
import { Installer } from '../../core/installer';
import { ConfigManager } from '../../config/config-manager';
import { Logger } from '../../utils/logger';

export function registerAddCommand(program: Command): void {
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

      if (!pkgJson[depField]) pkgJson[depField] = {};

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
