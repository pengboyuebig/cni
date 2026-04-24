import type { ResolvedPackage, PackageMetadata } from '../config/schema';
import { Logger } from '../utils/logger';
export interface DownloaderOptions {
    registry: string;
    cacheDir?: string;
    logger?: Logger;
}
export declare class Downloader {
    private registry;
    private npmCache;
    private logger?;
    constructor(options: DownloaderOptions);
    /**
     * 下载包到指定目录
     * 使用 pacote 下载并解压，自动校验 integrity
     */
    download(pkg: ResolvedPackage, targetDir: string): Promise<PackageMetadata>;
    /**
     * 解析包的精确版本
     */
    resolve(spec: string): Promise<ResolvedPackage>;
    /**
     * 计算目录大小
     */
    private getDirectorySize;
    /**
     * 格式化文件大小
     */
    private formatSize;
}
//# sourceMappingURL=downloader.d.ts.map