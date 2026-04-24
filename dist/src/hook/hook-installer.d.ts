import { Logger } from '../utils/logger';
/**
 * 在项目的 package.json 中安装 cni preinstall hook
 */
export declare function installHook(projectRoot: string, logger?: Logger): Promise<void>;
/**
 * 从项目的 package.json 中卸载 cni preinstall hook
 */
export declare function uninstallHook(projectRoot: string, logger?: Logger): Promise<void>;
//# sourceMappingURL=hook-installer.d.ts.map