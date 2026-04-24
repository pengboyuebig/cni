import * as path from 'path';
import * as fse from 'fs-extra';
import { cosmiconfig } from 'cosmiconfig';
import type { CniConfig } from './schema';
import { DEFAULTS, GLOBAL_CONFIG_PATH } from './defaults';

export class ConfigManager {
  /**
   * 加载并合并配置
   * 优先级: CLI > 环境变量 > 项目配置 > 全局配置 > 默认
   */
  async load(
    projectRoot: string,
    cliOverrides?: Partial<CniConfig>
  ): Promise<CniConfig> {
    // 1. 默认值
    let config = { ...DEFAULTS };

    // 2. 全局配置
    const globalConfig = await this.loadGlobalConfig();
    config = this.merge(config, globalConfig);

    // 3. 项目配置 (cosmiconfig 搜索 .cnirc / .cnirc.json / package.json#cni)
    const projectConfig = await this.loadProjectConfig(projectRoot);
    config = this.merge(config, projectConfig);

    // 4. 环境变量
    const envConfig = this.loadEnvConfig();
    config = this.merge(config, envConfig);

    // 5. CLI 参数
    if (cliOverrides) {
      config = this.merge(config, cliOverrides);
    }

    // 6. 相对路径解析
    if (!path.isAbsolute(config.store)) {
      config.store = path.resolve(projectRoot, config.store);
    }

    return config;
  }

  /**
   * 设置全局配置项
   */
  async setGlobal(key: string, value: string): Promise<void> {
    const dir = path.dirname(GLOBAL_CONFIG_PATH);
    await fse.ensureDir(dir);

    let existing: Record<string, unknown> = {};
    if (await fse.pathExists(GLOBAL_CONFIG_PATH)) {
      existing = await fse.readJson(GLOBAL_CONFIG_PATH);
    }

    existing[key] = this.parseValue(value);
    await fse.writeJson(GLOBAL_CONFIG_PATH, existing, { spaces: 2 });
  }

  /**
   * 获取全局配置
   */
  async getGlobal(key: string): Promise<unknown> {
    if (!(await fse.pathExists(GLOBAL_CONFIG_PATH))) {
      return undefined;
    }
    const config = await fse.readJson(GLOBAL_CONFIG_PATH);
    return config[key];
  }

  /**
   * 获取完整全局配置
   */
  async listGlobal(): Promise<Record<string, unknown>> {
    if (!(await fse.pathExists(GLOBAL_CONFIG_PATH))) {
      return {};
    }
    return fse.readJson(GLOBAL_CONFIG_PATH);
  }

  private merge(target: CniConfig, source: Partial<CniConfig>): CniConfig {
    const result = { ...target };
    for (const key of Object.keys(source) as (keyof CniConfig)[]) {
      const val = source[key];
      if (val !== undefined) {
        (result as Record<string, unknown>)[key] = val;
      }
    }
    return result;
  }

  private async loadGlobalConfig(): Promise<Partial<CniConfig>> {
    if (await fse.pathExists(GLOBAL_CONFIG_PATH)) {
      return fse.readJson(GLOBAL_CONFIG_PATH);
    }
    return {};
  }

  private async loadProjectConfig(
    projectRoot: string
  ): Promise<Partial<CniConfig>> {
    try {
      const explorer = cosmiconfig('cni');
      const result = await explorer.search(projectRoot);
      return (result?.config as Partial<CniConfig>) ?? {};
    } catch {
      return {};
    }
  }

  private loadEnvConfig(): Partial<CniConfig> {
    const env: Partial<CniConfig> = {};
    if (process.env.CNI_STORE) env.store = process.env.CNI_STORE;
    if (process.env.CNI_REGISTRY) env.registry = process.env.CNI_REGISTRY;
    if (process.env.CNI_PROXY) env.proxy = process.env.CNI_PROXY;
    if (process.env.CNI_HTTPS_PROXY) env.httpsProxy = process.env.CNI_HTTPS_PROXY;
    return env;
  }

  private parseValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    return value;
  }
}
