import chalk from 'chalk';

export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  info(msg: string): void {
    console.log(chalk.blue('i') + ' ' + msg);
  }

  success(msg: string): void {
    console.log(chalk.green('✓') + ' ' + msg);
  }

  warn(msg: string): void {
    console.log(chalk.yellow('!') + ' ' + msg);
  }

  error(msg: string): void {
    console.error(chalk.red('✗') + ' ' + msg);
  }

  debug(msg: string): void {
    if (this.verbose) {
      console.log(chalk.gray('…') + ' ' + msg);
    }
  }

  plain(msg: string): void {
    console.log(msg);
  }

  heading(msg: string): void {
    console.log('');
    console.log(chalk.bold(chalk.cyan(msg)));
  }

  summary(hits: number, misses: number, failed: number, elapsed: number): void {
    console.log('');
    console.log(
      chalk.bold('Summary:') +
        ` ${chalk.green(`${hits} cached`)} | ${chalk.blue(`${misses} downloaded`)} | ${chalk.red(`${failed} failed`)}`
    );
    console.log(
      `  Time: ${(elapsed / 1000).toFixed(1)}s` +
        (hits > 0 ? chalk.gray(` (saved from cache)`) : '')
    );
  }
}
