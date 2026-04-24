import type { ResolvedPackage, InstallOptions } from '../config/schema';
import { Logger } from '../utils/logger';
export declare class Resolver {
    private projectRoot;
    private logger?;
    constructor(projectRoot: string, logger?: Logger);
    /**
     * 从 package-lock.json 解析所有依赖
     * 返回扁平化的精确版本列表
     */
    resolve(options?: InstallOptions): Promise<ResolvedPackage[]>;
    /**
     * 从 package-lock.json v2/v3 解析
     */
    private resolveFromLockfile;
    /**
     * 从 package.json 解析 (无 lockfile 时的降级方案)
     */
    private resolveFromPackageJson;
    /**
     * 解析命令行指定的包
     */
    resolvePackages(specs: string[]): Promise<ResolvedPackage[]>;
    /**
     * 从 lockfile 路径提取包名
     * "node_modules/lodash" -> "lodash"
     * "node_modules/@babel/core" -> "@babel/core"
     */
    private extractPackageName;
    /**
     * 判断包是否是 devDependency
     */
    private isDevDependency;
}
//# sourceMappingURL=resolver.d.ts.map