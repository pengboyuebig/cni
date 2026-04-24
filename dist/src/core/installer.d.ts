import type { CniConfig, InstallOptions } from '../config/schema';
import { Logger } from '../utils/logger';
export declare class Installer {
    private projectRoot;
    private config;
    private cacheManager;
    private downloader;
    private resolver;
    private linker;
    private logger;
    constructor(projectRoot: string, config: CniConfig, logger?: Logger);
    /**
     * 安装依赖 - 主入口
     */
    install(packages: string[], options?: InstallOptions): Promise<void>;
    /**
     * 构建安装计划
     */
    private buildInstallPlan;
    /**
     * 下载包并写入缓存
     */
    private downloadAndCache;
}
//# sourceMappingURL=installer.d.ts.map