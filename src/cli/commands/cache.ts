import * as fse from 'fs-extra';
import { Command } from 'commander';
import { CacheManager } from '../../core/cache-manager';
import { ConfigManager } from '../../config/config-manager';
import { Logger } from '../../utils/logger';

export function registerCacheCommand(program: Command): void {
  const cacheCmd = program.command('cache').description('缓存管理');

  // cni cache ls [pattern]
  const lsCmd = cacheCmd
    .command('ls [pattern]')
    .description('列出缓存包');

  lsCmd.action(async (pattern?: string) => {
    const logger = new Logger();
    const configManager = new ConfigManager();
    const config = await configManager.load(process.cwd());
    const cacheManager = new CacheManager(config.store);

    const stats = await cacheManager.getStats();

    if (stats.packages.length === 0) {
      logger.info('Cache is empty');
      return;
    }

    const regex = pattern ? new RegExp(pattern, 'i') : null;

    for (const pkg of stats.packages) {
      if (regex && !regex.test(pkg.name)) continue;

      for (const ver of pkg.versions) {
        const sizeStr = ver.size > 0 ? ` (${formatSize(ver.size)})` : '';
        const refCount = ver.requiredBy.length > 0 ? ` [${ver.requiredBy.length} refs]` : '';
        logger.plain(`  ${pkg.name}@${ver.version}${sizeStr}${refCount}`);
      }
    }

    logger.plain('');
    logger.info(`Total: ${stats.totalPackages} packages, ${stats.totalVersions} versions, ${formatSize(stats.totalSize)}`);
  });

  // cni cache clean [pattern]
  const cleanCmd = cacheCmd
    .command('clean [pattern]')
    .description('清理缓存')
    .option('--all', '清理所有缓存');

  cleanCmd.action(async (pattern?: string) => {
    const opts = cleanCmd.opts();
    const logger = new Logger();
    const configManager = new ConfigManager();
    const config = await configManager.load(process.cwd());
    const cacheManager = new CacheManager(config.store);

    if (!pattern && !opts.all) {
      const result = await cacheManager.prune();
      logger.info(`Pruned ${result.removed} packages, freed ${formatSize(result.freedBytes)}`);
      return;
    }

    if (opts.all) {
      const storePath = config.store;
      if (await fse.pathExists(storePath)) {
        await fse.remove(storePath);
        logger.info('Cache cleared');
      } else {
        logger.info('Cache is already empty');
      }
      return;
    }

    // 按模式清理
    const stats = await cacheManager.getStats();
    const regex = new RegExp(pattern!, 'i');
    let removed = 0;

    for (const pkg of stats.packages) {
      if (!regex.test(pkg.name)) continue;
      for (const ver of pkg.versions) {
        await cacheManager.remove({ name: pkg.name, version: ver.version });
        removed++;
        logger.info(`Removed ${pkg.name}@${ver.version}`);
      }
    }

    logger.info(`Removed ${removed} versions`);
  });

  // cni cache stat
  const statCmd = cacheCmd
    .command('stat')
    .description('缓存统计信息');

  statCmd.action(async () => {
    const logger = new Logger();
    const configManager = new ConfigManager();
    const config = await configManager.load(process.cwd());
    const cacheManager = new CacheManager(config.store);

    const stats = await cacheManager.getStats();

    logger.plain(`Store path: ${config.store}`);
    logger.plain(`Packages:   ${stats.totalPackages}`);
    logger.plain(`Versions:   ${stats.totalVersions}`);
    logger.plain(`Total size: ${formatSize(stats.totalSize)}`);
  });

  // cni cache verify
  const verifyCmd = cacheCmd
    .command('verify')
    .description('校验所有缓存包完整性');

  verifyCmd.action(async () => {
    const logger = new Logger();
    const configManager = new ConfigManager();
    const config = await configManager.load(process.cwd());
    const cacheManager = new CacheManager(config.store);

    const stats = await cacheManager.getStats();
    let valid = 0;
    let invalid = 0;

    for (const pkg of stats.packages) {
      for (const ver of pkg.versions) {
        const ok = await cacheManager.verify({ name: pkg.name, version: ver.version });
        if (ok) {
          valid++;
        } else {
          invalid++;
          logger.warn(`INVALID: ${pkg.name}@${ver.version}`);
        }
      }
    }

    logger.plain('');
    logger.info(`Verified: ${valid} valid, ${invalid} invalid`);
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
