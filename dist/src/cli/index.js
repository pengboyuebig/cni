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
exports.CLI = void 0;
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// 读取版本号 - 编译后在 dist/src/cli/，需向上3级到项目根
const pkgPath = path.join(__dirname, '..', '..', '..', 'package.json');
const pkgVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version;
const install_1 = require("./commands/install");
const add_1 = require("./commands/add");
const cache_1 = require("./commands/cache");
const config_1 = require("./commands/config");
const hook_1 = require("./commands/hook");
class CLI {
    constructor() {
        this.program = new commander_1.Command();
        this.program
            .name('cni')
            .description('Cached npm install - symlink-based package cache manager')
            .version(pkgVersion);
        (0, install_1.registerInstallCommand)(this.program);
        (0, add_1.registerAddCommand)(this.program);
        (0, cache_1.registerCacheCommand)(this.program);
        (0, config_1.registerConfigCommand)(this.program);
        (0, hook_1.registerHookCommand)(this.program);
    }
    async run() {
        await this.program.parseAsync(process.argv);
    }
}
exports.CLI = CLI;
//# sourceMappingURL=index.js.map