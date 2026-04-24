import * as crypto from 'crypto';
import * as path from 'path';
import * as fse from 'fs-extra';

/**
 * 计算目录的快速 shasum (基于 package.json 内容)
 */
export async function quickShasum(packageDir: string): Promise<string> {
  const pkgJsonPath = path.join(packageDir, 'package.json');
  const content = await fse.readFile(pkgJsonPath);
  return crypto.createHash('sha1').update(content).digest('hex');
}

/**
 * 计算文件内容的 integrity (SHA-512)
 */
export function computeIntegrity(data: Buffer): string {
  const hash = crypto.createHash('sha512').update(data).digest('base64');
  return `sha512-${hash}`;
}

/**
 * 校验 integrity 字符串是否匹配
 * 支持 sha512-xxx 和 sha1-xxx 格式
 */
export function checkIntegrity(
  actual: string,
  expected: string
): boolean {
  if (!actual || !expected) return true; // 没有则跳过
  return actual === expected;
}

/**
 * 计算目录的完整 integrity
 * 遍历所有文件，按排序路径拼接后做 hash
 */
export async function fullDirectoryIntegrity(
  packageDir: string
): Promise<string> {
  const files = await listFilesRecursive(packageDir);
  files.sort();

  const hashes: string[] = [];
  for (const file of files) {
    const relativePath = path.relative(packageDir, file);
    const content = await fse.readFile(file);
    const hash = crypto
      .createHash('sha512')
      .update(content)
      .digest('base64');
    hashes.push(`${relativePath}:${hash}`);
  }

  return crypto
    .createHash('sha512')
    .update(hashes.join('\n'))
    .digest('base64');
}

/**
 * 递归列出目录下所有文件
 */
async function listFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fse.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}
