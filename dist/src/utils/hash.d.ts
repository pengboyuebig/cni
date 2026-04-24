/**
 * 计算目录的快速 shasum (基于 package.json 内容)
 */
export declare function quickShasum(packageDir: string): Promise<string>;
/**
 * 计算文件内容的 integrity (SHA-512)
 */
export declare function computeIntegrity(data: Buffer): string;
/**
 * 校验 integrity 字符串是否匹配
 * 支持 sha512-xxx 和 sha1-xxx 格式
 */
export declare function checkIntegrity(actual: string, expected: string): boolean;
/**
 * 计算目录的完整 integrity
 * 遍历所有文件，按排序路径拼接后做 hash
 */
export declare function fullDirectoryIntegrity(packageDir: string): Promise<string>;
//# sourceMappingURL=hash.d.ts.map