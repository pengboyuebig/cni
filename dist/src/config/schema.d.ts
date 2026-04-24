export interface CniConfig {
    /** 缓存存储根路径 */
    store: string;
    /** npm registry 地址 */
    registry: string;
    /** 链接类型: Windows 默认 junction, POSIX 默认 symlink */
    linkType: 'junction' | 'symlink';
    /** 是否验证缓存包完整性 */
    verifyIntegrity: boolean;
    /** 并发下载数 */
    concurrency: number;
    /** 是否运行 lifecycle scripts */
    runScripts: boolean;
    /** 最大缓存大小 (bytes), 0 = 无限 */
    maxStoreSize: number;
    /** HTTP proxy */
    proxy?: string;
    /** HTTPS proxy */
    httpsProxy?: string;
    /** 排除不缓存的包 (正则字符串) */
    excludePackages?: string[];
}
export interface PackageMetadata {
    name: string;
    version: string;
    integrity: string;
    resolved: string;
    shasum: string;
    installTime: number;
    size: number;
    deprecated?: boolean;
    requiredBy: string[];
}
export interface StoreMetadata {
    version: number;
    createdAt: number;
    totalPackages: number;
    totalVersions: number;
    totalSize: number;
    lastCleanup: number;
}
export interface ResolvedPackage {
    name: string;
    version: string;
    integrity?: string;
    resolved?: string;
    from?: string;
}
export interface InstallPlan {
    packages: ResolvedPackage[];
    hits: ResolvedPackage[];
    misses: ResolvedPackage[];
}
export interface InstallOptions {
    production?: boolean;
    ignoreScripts?: boolean;
    registry?: string;
    force?: boolean;
    noLinks?: boolean;
    verbose?: boolean;
    hookMode?: boolean;
}
export interface LinkResult {
    name: string;
    version: string;
    linkPath: string;
    target: string;
    status: 'linked' | 'skipped' | 'copy';
}
export interface CacheStats {
    totalPackages: number;
    totalVersions: number;
    totalSize: number;
    packages: Array<{
        name: string;
        versions: Array<{
            version: string;
            size: number;
            installTime: number;
            requiredBy: string[];
        }>;
    }>;
}
//# sourceMappingURL=schema.d.ts.map