/**
 * 创建包链接 (junction 或 symlink)
 */
export declare function createPackageLink(target: string, linkPath: string): Promise<'junction' | 'symlink' | 'copy'>;
/**
 * 检查路径是否为链接 (junction/symlink)
 */
export declare function isLink(pkgPath: string): Promise<boolean>;
/**
 * 读取链接目标
 */
export declare function readLink(linkPath: string): Promise<string | null>;
/**
 * 验证链接是否有效 (目标是否存在)
 */
export declare function validateLink(linkPath: string): Promise<boolean>;
/**
 * 安全移除链接 (不删除缓存源)
 */
export declare function removeLink(linkPath: string): Promise<void>;
/**
 * 检测 junction 在当前 Windows 环境下是否可用
 */
export declare function canCreateJunction(testDir: string): Promise<boolean>;
//# sourceMappingURL=fs.d.ts.map