import * as path from 'path';
import * as fse from 'fs-extra';
import type { ResolvedPackage, LinkResult } from '../config/schema';
import { Logger } from '../utils/logger';
import {
  createPackageLink,
  isLink,
  readLink,
  removeLink,
} from '../utils/fs';

export class Linker {
  private projectRoot: string;
  private storeRoot: string;
  private logger?: Logger;

  constructor(projectRoot: string, storeRoot: string, logger?: Logger) {
    this.projectRoot = projectRoot;
    this.storeRoot = storeRoot;
    this.logger = logger;
  }

  /**
   * 为所有包创建链接到 node_modules
   */
  async linkAll(packages: ResolvedPackage[]): Promise<LinkResult[]> {
    const results: LinkResult[] = [];
    const nodeModules = path.join(this.projectRoot, 'node_modules');

    // 确保 node_modules 目录存在
    await fse.ensureDir(nodeModules);

    for (const pkg of packages) {
      results.push(await this.link(pkg));
    }

    return results;
  }

  /**
   * 为单个包创建链接
   */
  async link(pkg: ResolvedPackage): Promise<LinkResult> {
    const target = this.getCachePackagePath(pkg);
    const linkPath = this.getNodeModulesPath(pkg);

    // 检查目标是否存在于缓存
    if (!(await fse.pathExists(target))) {
      this.logger?.warn(`Cache target not found: ${target}`);
      return {
        name: pkg.name,
        version: pkg.version,
        linkPath,
        target,
        status: 'skipped',
      };
    }

    // 如果 linkPath 已存在
    if (await fse.pathExists(linkPath)) {
      const isExistingLink = await isLink(linkPath);

      if (isExistingLink) {
        // 已有链接，检查目标是否一致
        const currentTarget = await readLink(linkPath);
        const resolvedCurrent = currentTarget
          ? path.resolve(path.dirname(linkPath), currentTarget)
          : null;

        if (resolvedCurrent === path.resolve(target)) {
          // 链接目标一致，跳过
          return {
            name: pkg.name,
            version: pkg.version,
            linkPath,
            target,
            status: 'skipped',
          };
        }

        // 目标不一致，移除旧链接
        this.logger?.debug(`Removing stale link for ${pkg.name}`);
        await removeLink(linkPath);
      } else {
        // 是普通目录 (npm 原始安装的)，需要移除
        this.logger?.debug(`Replacing existing directory for ${pkg.name}`);
        await fse.remove(linkPath);
      }
    }

    // 确保 scope 包的父目录存在 (@scope/)
    if (pkg.name.startsWith('@')) {
      const scopeDir = path.dirname(linkPath);
      await fse.ensureDir(scopeDir);
    }

    // 创建链接
    const linkType = await createPackageLink(target, linkPath);

    return {
      name: pkg.name,
      version: pkg.version,
      linkPath,
      target,
      status: linkType === 'copy' ? 'copy' : 'linked',
    };
  }

  /**
   * 移除包链接
   */
  async unlink(pkgName: string): Promise<void> {
    const linkPath = path.join(this.projectRoot, 'node_modules', pkgName);
    await removeLink(linkPath);
  }

  /**
   * 获取缓存中的包路径
   */
  getCachePackagePath(pkg: ResolvedPackage): string {
    return path.join(this.storeRoot, pkg.name, pkg.version, 'node_modules', pkg.name);
  }

  /**
   * 获取 node_modules 中的目标路径
   */
  getNodeModulesPath(pkg: ResolvedPackage): string {
    return path.join(this.projectRoot, 'node_modules', pkg.name);
  }

  /**
   * 清理 node_modules 中所有 cni 创建的链接
   */
  async unlinkAll(packages: ResolvedPackage[]): Promise<void> {
    for (const pkg of packages) {
      await this.unlink(pkg.name);
    }
  }
}
