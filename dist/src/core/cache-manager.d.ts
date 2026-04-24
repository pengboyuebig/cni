import type { ResolvedPackage, PackageMetadata, CacheStats } from '../config/schema';
export declare class CacheManager {
    private storeRoot;
    constructor(storeRoot: string);
    /**
     * 初始化 store 目录
     */
    init(): Promise<void>;
    /**
     * 检查缓存是否命中
     */
    has(pkg: ResolvedPackage): Promise<boolean>;
    /**
     * 获取缓存目录路径: <storeRoot>/<pkgName>/<version>/
     */
    getCachePath(pkg: ResolvedPackage): string;
    /**
     * 获取缓存包内容路径: <storeRoot>/<pkgName>/<version>/node_modules/<pkgName>/
     */
    getPackageContentPath(pkg: ResolvedPackage): string;
    /**
     * 写入缓存
     */
    put(pkg: ResolvedPackage, sourceDir: string, metadata: PackageMetadata): Promise<void>;
    /**
     * 添加项目引用
     */
    addReference(pkg: ResolvedPackage, projectRoot: string): Promise<void>;
    /**
     * 移除项目引用
     */
    removeReference(pkg: ResolvedPackage, projectRoot: string): Promise<void>;
    /**
     * 删除指定版本的缓存
     */
    remove(pkg: ResolvedPackage): Promise<void>;
    /**
     * 校验缓存包完整性 (快速)
     */
    verify(pkg: ResolvedPackage): Promise<boolean>;
    /**
     * 获取缓存统计信息
     */
    getStats(): Promise<CacheStats>;
    /**
     * 清理无引用的缓存包
     */
    prune(): Promise<{
        removed: number;
        freedBytes: number;
    }>;
    /**
     * 获取临时下载目录
     */
    getTmpDir(pkg: ResolvedPackage): string;
    /**
     * 清理临时目录
     */
    cleanTmp(): Promise<void>;
    private collectPackageStats;
    private updateStoreMetadata;
}
//# sourceMappingURL=cache-manager.d.ts.map