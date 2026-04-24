import * as path from 'path';
import * as fse from 'fs-extra';
import type { ResolvedPackage, PackageMetadata, StoreMetadata, CacheStats } from '../config/schema';
import { STORE_METADATA_FILE, PACKAGE_METADATA_FILE } from '../config/defaults';
import { quickShasum } from '../utils/hash';

export class CacheManager {
  private storeRoot: string;

  constructor(storeRoot: string) {
    this.storeRoot = storeRoot;
  }

  /**
   * 初始化 store 目录
   */
  async init(): Promise<void> {
    await fse.ensureDir(this.storeRoot);

    const metadataPath = path.join(this.storeRoot, STORE_METADATA_FILE);
    if (!(await fse.pathExists(metadataPath))) {
      const metadata: StoreMetadata = {
        version: 1,
        createdAt: Date.now(),
        totalPackages: 0,
        totalVersions: 0,
        totalSize: 0,
        lastCleanup: Date.now(),
      };
      await fse.writeJson(metadataPath, metadata, { spaces: 2 });
    }
  }

  /**
   * 检查缓存是否命中
   */
  async has(pkg: ResolvedPackage): Promise<boolean> {
    const cacheDir = this.getCachePath(pkg);
    const metadataPath = path.join(cacheDir, PACKAGE_METADATA_FILE);

    if (!(await fse.pathExists(cacheDir))) return false;
    if (!(await fse.pathExists(metadataPath))) return false;

    // 快速校验: package.json 存在
    const pkgPath = this.getPackageContentPath(pkg);
    if (!(await fse.pathExists(path.join(pkgPath, 'package.json')))) return false;

    // integrity 校验 (如果有)
    if (pkg.integrity) {
      try {
        const metadata = await fse.readJson(metadataPath);
        if (metadata.integrity && metadata.integrity !== pkg.integrity) {
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取缓存目录路径: <storeRoot>/<pkgName>/<version>/
   */
  getCachePath(pkg: ResolvedPackage): string {
    return path.join(this.storeRoot, pkg.name, pkg.version);
  }

  /**
   * 获取缓存包内容路径: <storeRoot>/<pkgName>/<version>/node_modules/<pkgName>/
   */
  getPackageContentPath(pkg: ResolvedPackage): string {
    return path.join(this.getCachePath(pkg), 'node_modules', pkg.name);
  }

  /**
   * 写入缓存
   */
  async put(
    pkg: ResolvedPackage,
    sourceDir: string,
    metadata: PackageMetadata
  ): Promise<void> {
    const cacheDir = this.getCachePath(pkg);

    // 如果已存在（并发场景），跳过
    if (await fse.pathExists(cacheDir)) return;

    // 确保父目录存在
    await fse.ensureDir(path.dirname(cacheDir));

    // 原子移动: sourceDir -> cacheDir
    await fse.move(sourceDir, cacheDir, { overwrite: false });

    // 写入 metadata
    const metadataPath = path.join(cacheDir, PACKAGE_METADATA_FILE);
    await fse.writeJson(metadataPath, metadata, { spaces: 2 });

    // 更新全局 metadata
    await this.updateStoreMetadata();
  }

  /**
   * 添加项目引用
   */
  async addReference(pkg: ResolvedPackage, projectRoot: string): Promise<void> {
    const metadataPath = path.join(this.getCachePath(pkg), PACKAGE_METADATA_FILE);
    if (!(await fse.pathExists(metadataPath))) return;

    try {
      const metadata: PackageMetadata = await fse.readJson(metadataPath);
      if (!metadata.requiredBy.includes(projectRoot)) {
        metadata.requiredBy.push(projectRoot);
        await fse.writeJson(metadataPath, metadata, { spaces: 2 });
      }
    } catch {
      // 忽略
    }
  }

  /**
   * 移除项目引用
   */
  async removeReference(pkg: ResolvedPackage, projectRoot: string): Promise<void> {
    const metadataPath = path.join(this.getCachePath(pkg), PACKAGE_METADATA_FILE);
    if (!(await fse.pathExists(metadataPath))) return;

    try {
      const metadata: PackageMetadata = await fse.readJson(metadataPath);
      metadata.requiredBy = metadata.requiredBy.filter((p) => p !== projectRoot);
      await fse.writeJson(metadataPath, metadata, { spaces: 2 });
    } catch {
      // 忽略
    }
  }

  /**
   * 删除指定版本的缓存
   */
  async remove(pkg: ResolvedPackage): Promise<void> {
    const cacheDir = this.getCachePath(pkg);
    await fse.remove(cacheDir);
    await this.updateStoreMetadata();
  }

  /**
   * 校验缓存包完整性 (快速)
   */
  async verify(pkg: ResolvedPackage): Promise<boolean> {
    const cacheDir = this.getCachePath(pkg);
    const pkgPath = this.getPackageContentPath(pkg);
    const metadataPath = path.join(cacheDir, PACKAGE_METADATA_FILE);

    if (!(await fse.pathExists(cacheDir))) return false;
    if (!(await fse.pathExists(metadataPath))) return false;
    if (!(await fse.pathExists(path.join(pkgPath, 'package.json')))) return false;

    try {
      const metadata: PackageMetadata = await fse.readJson(metadataPath);

      // shasum 快速校验
      if (metadata.shasum) {
        const currentShasum = await quickShasum(pkgPath);
        if (currentShasum !== metadata.shasum) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      totalPackages: 0,
      totalVersions: 0,
      totalSize: 0,
      packages: [],
    };

    if (!(await fse.pathExists(this.storeRoot))) return stats;

    const pkgDirs = await fse.readdir(this.storeRoot);
    for (const pkgDir of pkgDirs) {
      const pkgPath = path.join(this.storeRoot, pkgDir);
      if (!(await fse.stat(pkgPath)).isDirectory()) continue;
      if (pkgDir.startsWith('_')) continue; // 跳过 _metadata.json 等

      // 处理 scope 包: @scope
      if (pkgDir.startsWith('@')) {
        const scopeDirs = await fse.readdir(pkgPath);
        for (const scopeDir of scopeDirs) {
          const scopePath = path.join(pkgPath, scopeDir);
          if (!(await fse.stat(scopePath)).isDirectory()) continue;

          const fullName = `${pkgDir}/${scopeDir}`;
          const pkgStats = await this.collectPackageStats(fullName, scopePath);
          if (pkgStats.versions.length > 0) {
            stats.packages.push(pkgStats);
            stats.totalPackages++;
          }
        }
      } else {
        const pkgStats = await this.collectPackageStats(pkgDir, pkgPath);
        if (pkgStats.versions.length > 0) {
          stats.packages.push(pkgStats);
          stats.totalPackages++;
        }
      }
    }

    return stats;
  }

  /**
   * 清理无引用的缓存包
   */
  async prune(): Promise<{ removed: number; freedBytes: number }> {
    let removed = 0;
    let freedBytes = 0;

    const stats = await this.getStats();
    for (const pkg of stats.packages) {
      for (const ver of pkg.versions) {
        // 检查所有引用项目是否仍存在
        const aliveRefs = ver.requiredBy.filter((p) => fse.pathExistsSync(p));
        if (aliveRefs.length === 0 && ver.requiredBy.length > 0) {
          // 无活引用，可以清理
          const resolvedPkg: ResolvedPackage = {
            name: pkg.name,
            version: ver.version,
          };
          freedBytes += ver.size;
          await this.remove(resolvedPkg);
          removed++;
        }
      }
    }

    return { removed, freedBytes };
  }

  /**
   * 获取临时下载目录
   */
  getTmpDir(pkg: ResolvedPackage): string {
    return path.join(this.storeRoot, '.tmp', `${pkg.name.replace(/[\/\\]/g, '_')}-${pkg.version}`);
  }

  /**
   * 清理临时目录
   */
  async cleanTmp(): Promise<void> {
    const tmpDir = path.join(this.storeRoot, '.tmp');
    await fse.remove(tmpDir);
  }

  private async collectPackageStats(
    name: string,
    pkgPath: string
  ): Promise<CacheStats['packages'][0]> {
    const result: CacheStats['packages'][0] = { name, versions: [] };

    const versionDirs = await fse.readdir(pkgPath);
    for (const version of versionDirs) {
      const versionPath = path.join(pkgPath, version);
      if (!(await fse.stat(versionPath)).isDirectory()) continue;

      const metadataPath = path.join(versionPath, PACKAGE_METADATA_FILE);
      if (!(await fse.pathExists(metadataPath))) continue;

      try {
        const metadata: PackageMetadata = await fse.readJson(metadataPath);
        result.versions.push({
          version: metadata.version,
          size: metadata.size,
          installTime: metadata.installTime,
          requiredBy: metadata.requiredBy || [],
        });
      } catch {
        result.versions.push({
          version,
          size: 0,
          installTime: 0,
          requiredBy: [],
        });
      }
    }

    return result;
  }

  private async updateStoreMetadata(): Promise<void> {
    const stats = await this.getStats();
    const metadataPath = path.join(this.storeRoot, STORE_METADATA_FILE);

    let storeMeta: StoreMetadata;
    if (await fse.pathExists(metadataPath)) {
      storeMeta = await fse.readJson(metadataPath);
    } else {
      storeMeta = { version: 1, createdAt: Date.now(), totalPackages: 0, totalVersions: 0, totalSize: 0, lastCleanup: 0 };
    }

    storeMeta.totalPackages = stats.totalPackages;
    storeMeta.totalVersions = stats.packages.reduce(
      (sum, p) => sum + p.versions.length,
      0
    );
    storeMeta.totalSize = stats.packages.reduce(
      (sum, p) => sum + p.versions.reduce((s, v) => s + v.size, 0),
      0
    );

    await fse.writeJson(metadataPath, storeMeta, { spaces: 2 });
  }
}
