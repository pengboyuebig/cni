import * as path from 'path';
import * as fse from 'fs-extra';
import { Logger } from '../utils/logger';

/**
 * 在项目的 package.json 中安装 cni preinstall hook
 */
export async function installHook(projectRoot: string, logger?: Logger): Promise<void> {
  const pkgJsonPath = path.join(projectRoot, 'package.json');

  if (!(await fse.pathExists(pkgJsonPath))) {
    throw new Error('No package.json found');
  }

  const pkg = await fse.readJson(pkgJsonPath);
  if (!pkg.scripts) pkg.scripts = {};

  if (pkg.scripts.preinstall && pkg.scripts.preinstall.includes('cni')) {
    logger?.info('Hook already installed');
    return;
  }

  if (pkg.scripts.preinstall) {
    pkg.scripts.preinstall = `cni hook-run && ${pkg.scripts.preinstall}`;
  } else {
    pkg.scripts.preinstall = 'cni hook-run';
  }

  await fse.writeJson(pkgJsonPath, pkg, { spaces: 2 });
  logger?.success('npm preinstall hook installed');
}

/**
 * 从项目的 package.json 中卸载 cni preinstall hook
 */
export async function uninstallHook(projectRoot: string, logger?: Logger): Promise<void> {
  const pkgJsonPath = path.join(projectRoot, 'package.json');

  if (!(await fse.pathExists(pkgJsonPath))) {
    throw new Error('No package.json found');
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
    logger?.success('npm preinstall hook uninstalled');
  } else {
    logger?.info('No hook found');
  }
}
