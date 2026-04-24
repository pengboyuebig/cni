import * as path from 'path';
import * as fse from 'fs-extra';
import pacote from 'pacote';
import type { ResolvedPackage, PackageMetadata } from '../config/schema';
import { Logger } from '../utils/logger';
import { quickShasum, computeIntegrity } from '../utils/hash';
import { getNpmCacheDir } from '../utils/platform';

export interface DownloaderOptions {
  registry: string;
  cacheDir?: string;
  logger?: Logger;
}

export class Downloader {
  private registry: string;
  private npmCache: string;
  private logger?: Logger;

  constructor(options: DownloaderOptions) {
    this.registry = options.registry;
    this.npmCache = options.cacheDir || getNpmCacheDir();
    this.logger = options.logger;
  }

  /**
   * 下载包到指定目录
   * 使用 pacote 下载并解压，自动校验 integrity
   */
  async download(
    pkg: ResolvedPackage,
    targetDir: string
  ): Promise<PackageMetadata> {
    const spec = pkg.from || `${pkg.name}@${pkg.version}`;
    const pkgContentDir = path.join(targetDir, 'node_modules', pkg.name);

    this.logger?.debug(`Downloading ${spec}...`);

    // 确保 node_modules/<pkgName> 目录结构
    await fse.ensureDir(path.dirname(pkgContentDir));

    const pacoteOptions = {
      registry: this.registry,
      cache: this.npmCache,
      resolved: pkg.resolved,
      integrity: pkg.integrity,
    };

    // 下载并解压到 node_modules/<pkgName>/
    await pacote.extract(spec, pkgContentDir, pacoteOptions);

    // 获取 manifest 用于生成 metadata
    const manifest = await pacote.manifest(spec, {
      registry: this.registry,
      cache: this.npmCache,
    });

    // 计算包大小
    const size = await this.getDirectorySize(pkgContentDir);

    // 快速 shasum
    const shasum = await quickShasum(pkgContentDir);

    const metadata: PackageMetadata = {
      name: manifest.name,
      version: manifest.version,
      integrity:
        (manifest as any)._integrity || pkg.integrity || '',
      resolved:
        (manifest as any)._resolved || pkg.resolved || '',
      shasum: (manifest as any)._shasum || shasum,
      installTime: Date.now(),
      size,
      requiredBy: [],
    };

    this.logger?.debug(`Downloaded ${manifest.name}@${manifest.version} (${this.formatSize(size)})`);

    return metadata;
  }

  /**
   * 解析包的精确版本
   */
  async resolve(spec: string): Promise<ResolvedPackage> {
    const manifest = await pacote.manifest(spec, {
      registry: this.registry,
      cache: this.npmCache,
    });

    return {
      name: manifest.name,
      version: manifest.version,
      integrity: (manifest as any)._integrity,
      resolved: (manifest as any)._resolved,
      from: spec,
    };
  }

  /**
   * 计算目录大小
   */
  private async getDirectorySize(dir: string): Promise<number> {
    let totalSize = 0;
    const entries = await fse.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        totalSize += await this.getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        const stat = await fse.stat(fullPath);
        totalSize += stat.size;
      }
    }

    return totalSize;
  }

  /**
   * 格式化文件大小
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
