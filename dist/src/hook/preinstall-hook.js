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
exports.preinstallHook = preinstallHook;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const defaults_1 = require("../config/defaults");
const config_manager_1 = require("../config/config-manager");
const installer_1 = require("../core/installer");
const logger_1 = require("../utils/logger");
/**
 * npm preinstall hook 入口
 * 被 npm 作为 lifecycle script 调用
 */
async function preinstallHook() {
    // 防止递归
    if (process.env[defaults_1.CNI_ACTIVE_ENV])
        return;
    const logger = new logger_1.Logger();
    const cwd = process.cwd();
    try {
        process.env[defaults_1.CNI_ACTIVE_ENV] = '1';
        const configManager = new config_manager_1.ConfigManager();
        const config = await configManager.load(cwd);
        const installer = new installer_1.Installer(cwd, config, logger);
        await installer.install([], {
            ignoreScripts: true,
            hookMode: true,
        });
        // 创建标记文件
        await fse.ensureDir(path.join(cwd, 'node_modules'));
        await fse.writeFile(path.join(cwd, 'node_modules', defaults_1.CNI_DONE_MARKER), Date.now().toString());
        logger.info('cni: Packages installed from cache');
    }
    catch (err) {
        logger.warn(`cni hook failed, falling back to npm: ${err.message}`);
    }
    finally {
        delete process.env[defaults_1.CNI_ACTIVE_ENV];
    }
}
//# sourceMappingURL=preinstall-hook.js.map