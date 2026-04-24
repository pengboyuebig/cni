import { Command } from 'commander';
import { ConfigManager } from '../../config/config-manager';
import { DEFAULTS } from '../../config/defaults';
import { Logger } from '../../utils/logger';

export function registerConfigCommand(program: Command): void {
  const configCmd = program.command('config').description('配置管理');

  // cni config get <key>
  configCmd
    .command('get <key>')
    .description('查看配置值')
    .action(async (key: string) => {
      const logger = new Logger();
      const configManager = new ConfigManager();

      // 先从全局配置获取
      const globalVal = await configManager.getGlobal(key);
      if (globalVal !== undefined) {
        logger.plain(`${key} = ${JSON.stringify(globalVal)}`);
      } else if ((DEFAULTS as any)[key] !== undefined) {
        logger.plain(`${key} = ${JSON.stringify((DEFAULTS as any)[key])} (default)`);
      } else {
        logger.warn(`Unknown config key: ${key}`);
      }
    });

  // cni config set <key> <value>
  configCmd
    .command('set <key> <value>')
    .description('设置全局配置值')
    .action(async (key: string, value: string) => {
      const logger = new Logger();
      const configManager = new ConfigManager();

      await configManager.setGlobal(key, value);
      logger.success(`Set ${key} = ${value}`);
    });

  // cni config list
  configCmd
    .command('list')
    .description('列出所有配置')
    .action(async () => {
      const logger = new Logger();
      const configManager = new ConfigManager();

      // 合并显示: 默认 + 全局覆盖
      const globalConfig = await configManager.listGlobal();

      logger.heading('Default configuration:');
      for (const [key, val] of Object.entries(DEFAULTS)) {
        const override = (globalConfig as any)[key];
        if (override !== undefined) {
          logger.plain(`  ${key} = ${JSON.stringify(override)} ${chalk.gray('(overridden)')}`);
        } else {
          logger.plain(`  ${key} = ${JSON.stringify(val)}`);
        }
      }

      // 显示全局配置中额外的字段
      for (const [key, val] of Object.entries(globalConfig)) {
        if (!(key in DEFAULTS)) {
          logger.plain(`  ${key} = ${JSON.stringify(val)} ${chalk.gray('(custom)')}`);
        }
      }
    });
}

// chalk 在函数内使用，避免顶层导入问题
import chalk from 'chalk';
