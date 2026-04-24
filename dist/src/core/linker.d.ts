import type { ResolvedPackage, LinkResult } from '../config/schema';
import { Logger } from '../utils/logger';
export declare class Linker {
    private projectRoot;
    private storeRoot;
    private logger?;
    constructor(projectRoot: string, storeRoot: string, logger?: Logger);
    /**
     * 为所有包创建链接到 node_modules
     */
    linkAll(packages: ResolvedPackage[]): Promise<LinkResult[]>;
    /**
     * 为单个包创建链接
     */
    link(pkg: ResolvedPackage): Promise<LinkResult>;
    /**
     * 移除包链接
     */
    unlink(pkgName: string): Promise<void>;
    /**
     * 获取缓存中的包路径
     */
    getCachePackagePath(pkg: ResolvedPackage): string;
    /**
     * 获取 node_modules 中的目标路径
     */
    getNodeModulesPath(pkg: ResolvedPackage): string;
    /**
     * 清理 node_modules 中所有 cni 创建的链接
     */
    unlinkAll(packages: ResolvedPackage[]): Promise<void>;
}
//# sourceMappingURL=linker.d.ts.map