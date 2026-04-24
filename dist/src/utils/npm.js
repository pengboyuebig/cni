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
exports.runNpm = runNpm;
exports.runLifecycleScript = runLifecycleScript;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
/**
 * 执行 npm 命令
 */
async function runNpm(args, cwd, logger) {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    return new Promise((resolve) => {
        const proc = (0, child_process_1.execFile)(npmCmd, args, { cwd, maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
            resolve({
                stdout: stdout || '',
                stderr: stderr || '',
                code: error ? error.code ? 1 : 1 : 0,
            });
        });
        proc.on('error', (err) => {
            logger?.error(`npm command failed: ${err.message}`);
            resolve({ stdout: '', stderr: err.message, code: 1 });
        });
    });
}
/**
 * 运行包的 lifecycle script
 */
async function runLifecycleScript(packageDir, scriptName, logger) {
    try {
        const pkgJson = require(path.join(packageDir, 'package.json'));
        const script = pkgJson.scripts?.[scriptName];
        if (!script)
            return;
        logger?.debug(`Running ${scriptName} in ${path.basename(packageDir)}`);
        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        await new Promise((resolve, reject) => {
            (0, child_process_1.execFile)(npmCmd, ['run', scriptName], { cwd: packageDir, maxBuffer: 10 * 1024 * 1024 }, (error) => {
                if (error)
                    reject(error);
                else
                    resolve();
            });
        });
    }
    catch (err) {
        logger?.warn(`Failed to run ${scriptName}: ${err.message}`);
    }
}
//# sourceMappingURL=npm.js.map