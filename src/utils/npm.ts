import { execFile } from 'child_process';
import * as path from 'path';
import { Logger } from './logger';

/**
 * 执行 npm 命令
 */
export async function runNpm(
  args: string[],
  cwd: string,
  logger?: Logger
): Promise<{ stdout: string; stderr: string; code: number }> {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  return new Promise((resolve) => {
    const proc = execFile(
      npmCmd,
      args,
      { cwd, maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          code: error ? (error as NodeJS.ErrnoException).code ? 1 : 1 : 0,
        });
      }
    );

    proc.on('error', (err) => {
      logger?.error(`npm command failed: ${err.message}`);
      resolve({ stdout: '', stderr: err.message, code: 1 });
    });
  });
}

/**
 * 运行包的 lifecycle script
 */
export async function runLifecycleScript(
  packageDir: string,
  scriptName: string,
  logger?: Logger
): Promise<void> {
  try {
    const pkgJson = require(path.join(packageDir, 'package.json'));
    const script = pkgJson.scripts?.[scriptName];
    if (!script) return;

    logger?.debug(`Running ${scriptName} in ${path.basename(packageDir)}`);

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await new Promise<void>((resolve, reject) => {
      execFile(
        npmCmd,
        ['run', scriptName],
        { cwd: packageDir, maxBuffer: 10 * 1024 * 1024 },
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });
  } catch (err) {
    logger?.warn(`Failed to run ${scriptName}: ${(err as Error).message}`);
  }
}
