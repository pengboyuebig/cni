import { Logger } from './logger';
/**
 * 执行 npm 命令
 */
export declare function runNpm(args: string[], cwd: string, logger?: Logger): Promise<{
    stdout: string;
    stderr: string;
    code: number;
}>;
/**
 * 运行包的 lifecycle script
 */
export declare function runLifecycleScript(packageDir: string, scriptName: string, logger?: Logger): Promise<void>;
//# sourceMappingURL=npm.d.ts.map