import * as path from 'path';
import * as fse from 'fs-extra';
import { CNI_ACTIVE_ENV, CNI_DONE_MARKER } from '../config/defaults';
import { ConfigManager } from '../config/config-manager';
import { Installer } from '../core/installer';
import { Logger } from '../utils/logger';

/**
 * npm preinstall hook 入口
 * 被 npm 作为 lifecycle script 调用
 */
export async function preinstallHook(): Promise<void> {
  // 防止递归
  if (process.env[CNI_ACTIVE_ENV]) return;

  const logger = new Logger();
  const cwd = process.cwd();

  try {
    process.env[CNI_ACTIVE_ENV] = '1';

    const configManager = new ConfigManager();
    const config = await configManager.load(cwd);

    const installer = new Installer(cwd, config, logger);
    await installer.install([], {
      ignoreScripts: true,
      hookMode: true,
    });

    // 创建标记文件
    await fse.ensureDir(path.join(cwd, 'node_modules'));
    await fse.writeFile(
      path.join(cwd, 'node_modules', CNI_DONE_MARKER),
      Date.now().toString()
    );

    logger.info('cni: Packages installed from cache');
  } catch (err) {
    logger.warn(`cni hook failed, falling back to npm: ${(err as Error).message}`);
  } finally {
    delete process.env[CNI_ACTIVE_ENV];
  }
}
