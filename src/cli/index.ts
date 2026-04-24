import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

// 读取版本号 - 编译后在 dist/src/cli/，需向上3级到项目根
const pkgPath = path.join(__dirname, '..', '..', '..', 'package.json');
const pkgVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version;
import { registerInstallCommand } from './commands/install';
import { registerAddCommand } from './commands/add';
import { registerCacheCommand } from './commands/cache';
import { registerConfigCommand } from './commands/config';
import { registerHookCommand } from './commands/hook';

export class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();

    this.program
      .name('cni')
      .description('Cached npm install - symlink-based package cache manager')
      .version(pkgVersion);

    registerInstallCommand(this.program);
    registerAddCommand(this.program);
    registerCacheCommand(this.program);
    registerConfigCommand(this.program);
    registerHookCommand(this.program);
  }

  async run(): Promise<void> {
    await this.program.parseAsync(process.argv);
  }
}
