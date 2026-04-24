import * as path from 'path';
import * as fse from 'fs-extra';
import type { ResolvedPackage, InstallOptions } from '../config/schema';
import { Logger } from '../utils/logger';

export class Resolver {
  private projectRoot: string;
  private logger?: Logger;

  constructor(projectRoot: string, logger?: Logger) {
    this.projectRoot = projectRoot;
    this.logger = logger;
  }

  /**
   * 从 package-lock.json 解析所有依赖
   * 返回扁平化的精确版本列表
   */
  async resolve(options?: InstallOptions): Promise<ResolvedPackage[]> {
    const lockfilePath = path.join(this.projectRoot, 'package-lock.json');
    const pkgJsonPath = path.join(this.projectRoot, 'package.json');

    // 优先从 lockfile 解析
    if (await fse.pathExists(lockfilePath)) {
      return this.resolveFromLockfile(lockfilePath, options);
    }

    // 降级: 从 package.json 解析 (版本可能不是精确的)
    if (await fse.pathExists(pkgJsonPath)) {
      return this.resolveFromPackageJson(pkgJsonPath, options);
    }

    throw new Error('No package.json or package-lock.json found');
  }

  /**
   * 从 package-lock.json v2/v3 解析
   */
  private async resolveFromLockfile(
    lockfilePath: string,
    options?: InstallOptions
  ): Promise<ResolvedPackage[]> {
    const lockfile = await fse.readJson(lockfilePath);
    const packages = lockfile.packages || {};
    const resolved: ResolvedPackage[] = [];
    const seen = new Set<string>();

    for (const [pkgPath, info] of Object.entries(packages)) {
      // 跳过根项目 ("")
      if (pkgPath === '') continue;

      // 只处理 node_modules/ 开头的顶层包
      if (!pkgPath.startsWith('node_modules/')) continue;

      // 跳过嵌套依赖 (node_modules/a/node_modules/b)
      if (pkgPath.split('node_modules/').length > 2) continue;

      const pkgName = this.extractPackageName(pkgPath);
      const key = `${pkgName}@${(info as any).version}`;

      if (seen.has(key)) continue;
      seen.add(key);

      // 跳过 devDependencies (如果 --production)
      if (options?.production && this.isDevDependency(pkgName, lockfile)) {
        continue;
      }

      resolved.push({
        name: pkgName,
        version: (info as any).version,
        integrity: (info as any).integrity,
        resolved: (info as any).resolved,
      });
    }

    this.logger?.debug(`Resolved ${resolved.length} packages from lockfile`);
    return resolved;
  }

  /**
   * 从 package.json 解析 (无 lockfile 时的降级方案)
   */
  private async resolveFromPackageJson(
    pkgJsonPath: string,
    options?: InstallOptions
  ): Promise<ResolvedPackage[]> {
    const pkg = await fse.readJson(pkgJsonPath);
    const resolved: ResolvedPackage[] = [];

    const deps = pkg.dependencies || {};
    const devDeps = options?.production ? {} : (pkg.devDependencies || {});

    const allDeps = { ...deps, ...devDeps };

    for (const [name, version] of Object.entries(allDeps)) {
      resolved.push({
        name,
        version: version as string,
        from: `${name}@${version}`,
      });
    }

    this.logger?.debug(`Resolved ${resolved.length} packages from package.json (no lockfile)`);
    return resolved;
  }

  /**
   * 解析命令行指定的包
   */
  async resolvePackages(specs: string[]): Promise<ResolvedPackage[]> {
    return specs.map((spec) => {
      // 尝试解析 name@version 格式
      const match = spec.match(/^(.+?)(?:@(.+))?$/);
      if (!match) {
        throw new Error(`Invalid package spec: ${spec}`);
      }

      const name = match[1];
      const version = match[2] || 'latest';

      return {
        name,
        version,
        from: spec,
      };
    });
  }

  /**
   * 从 lockfile 路径提取包名
   * "node_modules/lodash" -> "lodash"
   * "node_modules/@babel/core" -> "@babel/core"
   */
  private extractPackageName(pkgPath: string): string {
    let name = pkgPath.replace(/^node_modules\//, '');

    // 嵌套依赖: "express/node_modules/cookie" -> 取最后一个
    if (name.includes('/node_modules/')) {
      name = name.split('/node_modules/').pop()!;
    }

    return name;
  }

  /**
   * 判断包是否是 devDependency
   */
  private isDevDependency(
    pkgName: string,
    lockfile: any
  ): boolean {
    const rootPkg = lockfile.packages?.[''];
    if (!rootPkg) return false;

    const devDeps = rootPkg.devDependencies || {};
    return pkgName in devDeps;
  }
}
