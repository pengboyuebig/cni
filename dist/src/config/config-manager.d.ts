import type { CniConfig } from './schema';
export declare class ConfigManager {
    /**
     * 加载并合并配置
     * 优先级: CLI > 环境变量 > 项目配置 > 全局配置 > 默认
     */
    load(projectRoot: string, cliOverrides?: Partial<CniConfig>): Promise<CniConfig>;
    /**
     * 设置全局配置项
     */
    setGlobal(key: string, value: string): Promise<void>;
    /**
     * 获取全局配置
     */
    getGlobal(key: string): Promise<unknown>;
    /**
     * 获取完整全局配置
     */
    listGlobal(): Promise<Record<string, unknown>>;
    private merge;
    private loadGlobalConfig;
    private loadProjectConfig;
    private loadEnvConfig;
    private parseValue;
}
//# sourceMappingURL=config-manager.d.ts.map