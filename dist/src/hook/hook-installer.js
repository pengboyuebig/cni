"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.installHook = installHook;
exports.uninstallHook = uninstallHook;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
/**
 * 在项目的 package.json 中安装 cni preinstall hook
 */
async function installHook(projectRoot, logger) {
    const pkgJsonPath = path.join(projectRoot, 'package.json');
    if (!(await fse.pathExists(pkgJsonPath))) {
        throw new Error('No package.json found');
    }
    const pkg = await fse.readJson(pkgJsonPath);
    if (!pkg.scripts)
        pkg.scripts = {};
    if (pkg.scripts.preinstall && pkg.scripts.preinstall.includes('cni')) {
        logger?.info('Hook already installed');
        return;
    }
    if (pkg.scripts.preinstall) {
        pkg.scripts.preinstall = `cni hook-run && ${pkg.scripts.preinstall}`;
    }
    else {
        pkg.scripts.preinstall = 'cni hook-run';
    }
    await fse.writeJson(pkgJsonPath, pkg, { spaces: 2 });
    logger?.success('npm preinstall hook installed');
}
/**
 * 从项目的 package.json 中卸载 cni preinstall hook
 */
async function uninstallHook(projectRoot, logger) {
    const pkgJsonPath = path.join(projectRoot, 'package.json');
    if (!(await fse.pathExists(pkgJsonPath))) {
        throw new Error('No package.json found');
    }
    const pkg = await fse.readJson(pkgJsonPath);
    if (pkg.scripts?.preinstall) {
        pkg.scripts.preinstall = pkg.scripts.preinstall
            .replace(/cni hook-run\s*&&?\s*/g, '')
            .trim();
        if (!pkg.scripts.preinstall) {
            delete pkg.scripts.preinstall;
        }
        await fse.writeJson(pkgJsonPath, pkg, { spaces: 2 });
        logger?.success('npm preinstall hook uninstalled');
    }
    else {
        logger?.info('No hook found');
    }
}
//# sourceMappingURL=hook-installer.js.map