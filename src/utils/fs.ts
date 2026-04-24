import * as fs from 'fs';
import * as path from 'path';
import * as fse from 'fs-extra';
import { isWindows } from './platform';

/**
 * 创建包链接 (junction 或 symlink)
 */
export async function createPackageLink(
  target: string,
  linkPath: string
): Promise<'junction' | 'symlink' | 'copy'> {
  // 确保目标路径为绝对路径
  const absoluteTarget = path.resolve(target);

  if (isWindows()) {
    // Windows: 使用 junction (目录联接)
    // 不需要管理员权限，只能用于目录
    try {
      await fs.promises.symlink(absoluteTarget, linkPath, 'junction');
      return 'junction';
    } catch (err) {
      // junction 失败，回退到硬拷贝
      return await fallbackCopy(absoluteTarget, linkPath);
    }
  } else {
    // POSIX: 使用相对路径 symlink
    const relativeTarget = path.relative(path.dirname(linkPath), absoluteTarget);
    try {
      await fs.promises.symlink(relativeTarget, linkPath);
      return 'symlink';
    } catch (err) {
      // symlink 失败，回退到硬拷贝
      return await fallbackCopy(absoluteTarget, linkPath);
    }
  }
}

/**
 * 回退到硬拷贝
 */
async function fallbackCopy(
  target: string,
  linkPath: string
): Promise<'copy'> {
  await fse.copy(target, linkPath);
  return 'copy';
}

/**
 * 检查路径是否为链接 (junction/symlink)
 */
export async function isLink(pkgPath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.lstat(pkgPath);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * 读取链接目标
 */
export async function readLink(linkPath: string): Promise<string | null> {
  try {
    return await fs.promises.readlink(linkPath);
  } catch {
    return null;
  }
}

/**
 * 验证链接是否有效 (目标是否存在)
 */
export async function validateLink(linkPath: string): Promise<boolean> {
  try {
    const target = await fs.promises.readlink(linkPath);
    const resolved = path.resolve(path.dirname(linkPath), target);
    return fse.pathExists(resolved);
  } catch {
    return false;
  }
}

/**
 * 安全移除链接 (不删除缓存源)
 */
export async function removeLink(linkPath: string): Promise<void> {
  try {
    const stat = await fs.promises.lstat(linkPath);
    if (stat.isSymbolicLink()) {
      await fs.promises.unlink(linkPath);
    } else if (stat.isDirectory()) {
      // 非 symlink 目录，可能是硬拷贝或原始 npm 安装
      await fse.remove(linkPath);
    }
  } catch {
    // 文件不存在，忽略
  }
}

/**
 * 检测 junction 在当前 Windows 环境下是否可用
 */
export async function canCreateJunction(testDir: string): Promise<boolean> {
  if (!isWindows()) return false;

  const testTarget = path.join(testDir, '_cni_junction_test_target');
  const testLink = path.join(testDir, '_cni_junction_test_link');

  try {
    await fse.ensureDir(testTarget);
    await fs.promises.symlink(testTarget, testLink, 'junction');
    const stat = await fs.promises.lstat(testLink);
    await fse.remove(testLink);
    await fse.remove(testTarget);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}
