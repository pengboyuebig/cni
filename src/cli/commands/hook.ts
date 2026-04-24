import * as path from 'path';
import * as fse from 'fs-extra';
import { Command } from 'commander';
import { ConfigManager } from '../../config/config-manager';
import { CNI_ACTIVE_ENV } from '../../config/defaults';
import { Logger } from '../../utils/logger';

export function registerHookCommand(program: Command): void {
  const hookCmd = program.command('hook').description('npm hook 管理');

  // cni hook install
  hookCmd
    .command('install')
    .description('安装 npm preinstall hook')
    .action(async () => {
      const logger = new Logger();
      const cwd = process.cwd();
      const pkgJsonPath = path.join(cwd, 'package.json');

      if (!(await fse.pathExists(pkgJsonPath))) {
        logger.error('No package.json found in current directory');
        return;
      }

      const pkg = await fse.readJson(pkgJsonPath);
      if (!pkg.scripts) pkg.scripts = {};

      if (pkg.scripts.preinstall && pkg.scripts.preinstall.includes('cni')) {
        logger.info('Hook already installed');
        return;
      }

      if (pkg.scripts.preinstall) {
        pkg.scripts.preinstall = `cni hook-run && ${pkg.scripts.preinstall}`;
      } else {
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
      const logger = new Logger();
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
      } else {
        logger.info('No hook found');
      }
    });

  // cni hook-run (由 npm preinstall 调用)
  hookCmd
    .command('hook-run')
    .description('运行 preinstall hook (由 npm 自动调用)')
    .action(async () => {
      // 防止递归
      if (process.env[CNI_ACTIVE_ENV]) return;

      const logger = new Logger();
      const cwd = process.cwd();

      try {
        process.env[CNI_ACTIVE_ENV] = '1';

        const configManager = new ConfigManager();
        const config = await configManager.load(cwd);

        const { Installer } = await import('../../core/installer');
        const installer = new Installer(cwd, config, logger);
        await installer.install([], {
          ignoreScripts: true, // hook 模式下不运行脚本，避免递归
          hookMode: true,
        });

        // 创建标记文件
        const fse = await import('fs-extra');
        await fse.ensureDir(path.join(cwd, 'node_modules'));
        await fse.writeFile(
          path.join(cwd, 'node_modules', '.cni-done'),
          Date.now().toString()
        );
      } catch (err) {
        // hook 失败不阻断 npm 正常安装
        logger.warn(`cni hook failed, falling back to npm: ${(err as Error).message}`);
      } finally {
        delete process.env[CNI_ACTIVE_ENV];
      }
    });
}
