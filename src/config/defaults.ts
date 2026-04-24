import * as os from 'os';
import * as path from 'path';
import type { CniConfig } from './schema';

export const DEFAULTS: CniConfig = {
  store: path.join(os.homedir(), '.cni', 'store'),
  registry: 'https://registry.npmjs.org',
  linkType: process.platform === 'win32' ? 'junction' : 'symlink',
  verifyIntegrity: true,
  concurrency: 4,
  runScripts: true,
  maxStoreSize: 0,
};

export const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.cni');
export const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config.json');
export const STORE_METADATA_FILE = '_metadata.json';
export const PACKAGE_METADATA_FILE = '.metadata.json';
export const CNI_ACTIVE_ENV = 'CNI_ACTIVE';
export const CNI_DONE_MARKER = '.cni-done';
