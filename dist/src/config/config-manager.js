"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const cosmiconfig_1 = require("cosmiconfig");
const defaults_1 = require("./defaults");
class ConfigManager {
    /**
     * 加载并合并配置
     * 优先级: CLI > 环境变量 > 项目配置 > 全局配置 > 默认
     */
    async load(projectRoot, cliOverrides) {
        // 1. 默认值
        let config = { ...defaults_1.DEFAULTS };
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
    async setGlobal(key, value) {
        const dir = path.dirname(defaults_1.GLOBAL_CONFIG_PATH);
        await fse.ensureDir(dir);
        let existing = {};
        if (await fse.pathExists(defaults_1.GLOBAL_CONFIG_PATH)) {
            existing = await fse.readJson(defaults_1.GLOBAL_CONFIG_PATH);
        }
        existing[key] = this.parseValue(value);
        await fse.writeJson(defaults_1.GLOBAL_CONFIG_PATH, existing, { spaces: 2 });
    }
    /**
     * 获取全局配置
     */
    async getGlobal(key) {
        if (!(await fse.pathExists(defaults_1.GLOBAL_CONFIG_PATH))) {
            return undefined;
        }
        const config = await fse.readJson(defaults_1.GLOBAL_CONFIG_PATH);
        return config[key];
    }
    /**
     * 获取完整全局配置
     */
    async listGlobal() {
        if (!(await fse.pathExists(defaults_1.GLOBAL_CONFIG_PATH))) {
            return {};
        }
        return fse.readJson(defaults_1.GLOBAL_CONFIG_PATH);
    }
    merge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            const val = source[key];
            if (val !== undefined) {
                result[key] = val;
            }
        }
        return result;
    }
    async loadGlobalConfig() {
        if (await fse.pathExists(defaults_1.GLOBAL_CONFIG_PATH)) {
            return fse.readJson(defaults_1.GLOBAL_CONFIG_PATH);
        }
        return {};
    }
    async loadProjectConfig(projectRoot) {
        try {
            const explorer = (0, cosmiconfig_1.cosmiconfig)('cni');
            const result = await explorer.search(projectRoot);
            return result?.config ?? {};
        }
        catch {
            return {};
        }
    }
    loadEnvConfig() {
        const env = {};
        if (process.env.CNI_STORE)
            env.store = process.env.CNI_STORE;
        if (process.env.CNI_REGISTRY)
            env.registry = process.env.CNI_REGISTRY;
        if (process.env.CNI_PROXY)
            env.proxy = process.env.CNI_PROXY;
        if (process.env.CNI_HTTPS_PROXY)
            env.httpsProxy = process.env.CNI_HTTPS_PROXY;
        return env;
    }
    parseValue(value) {
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        if (/^\d+$/.test(value))
            return parseInt(value, 10);
        return value;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config-manager.js.map