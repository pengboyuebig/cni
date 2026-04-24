"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConfigCommand = registerConfigCommand;
const config_manager_1 = require("../../config/config-manager");
const defaults_1 = require("../../config/defaults");
const logger_1 = require("../../utils/logger");
function registerConfigCommand(program) {
    const configCmd = program.command('config').description('配置管理');
    // cni config get <key>
    configCmd
        .command('get <key>')
        .description('查看配置值')
        .action(async (key) => {
        const logger = new logger_1.Logger();
        const configManager = new config_manager_1.ConfigManager();
        // 先从全局配置获取
        const globalVal = await configManager.getGlobal(key);
        if (globalVal !== undefined) {
            logger.plain(`${key} = ${JSON.stringify(globalVal)}`);
        }
        else if (defaults_1.DEFAULTS[key] !== undefined) {
            logger.plain(`${key} = ${JSON.stringify(defaults_1.DEFAULTS[key])} (default)`);
        }
        else {
            logger.warn(`Unknown config key: ${key}`);
        }
    });
    // cni config set <key> <value>
    configCmd
        .command('set <key> <value>')
        .description('设置全局配置值')
        .action(async (key, value) => {
        const logger = new logger_1.Logger();
        const configManager = new config_manager_1.ConfigManager();
        await configManager.setGlobal(key, value);
        logger.success(`Set ${key} = ${value}`);
    });
    // cni config list
    configCmd
        .command('list')
        .description('列出所有配置')
        .action(async () => {
        const logger = new logger_1.Logger();
        const configManager = new config_manager_1.ConfigManager();
        // 合并显示: 默认 + 全局覆盖
        const globalConfig = await configManager.listGlobal();
        logger.heading('Default configuration:');
        for (const [key, val] of Object.entries(defaults_1.DEFAULTS)) {
            const override = globalConfig[key];
            if (override !== undefined) {
                logger.plain(`  ${key} = ${JSON.stringify(override)} ${chalk_1.default.gray('(overridden)')}`);
            }
            else {
                logger.plain(`  ${key} = ${JSON.stringify(val)}`);
            }
        }
        // 显示全局配置中额外的字段
        for (const [key, val] of Object.entries(globalConfig)) {
            if (!(key in defaults_1.DEFAULTS)) {
                logger.plain(`  ${key} = ${JSON.stringify(val)} ${chalk_1.default.gray('(custom)')}`);
            }
        }
    });
}
// chalk 在函数内使用，避免顶层导入问题
const chalk_1 = __importDefault(require("chalk"));
//# sourceMappingURL=config.js.map