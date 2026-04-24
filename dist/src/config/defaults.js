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
exports.CNI_DONE_MARKER = exports.CNI_ACTIVE_ENV = exports.PACKAGE_METADATA_FILE = exports.STORE_METADATA_FILE = exports.GLOBAL_CONFIG_PATH = exports.GLOBAL_CONFIG_DIR = exports.DEFAULTS = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.DEFAULTS = {
    store: path.join(os.homedir(), '.cni', 'store'),
    registry: 'https://registry.npmjs.org',
    linkType: process.platform === 'win32' ? 'junction' : 'symlink',
    verifyIntegrity: true,
    concurrency: 4,
    runScripts: true,
    maxStoreSize: 0,
};
exports.GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.cni');
exports.GLOBAL_CONFIG_PATH = path.join(exports.GLOBAL_CONFIG_DIR, 'config.json');
exports.STORE_METADATA_FILE = '_metadata.json';
exports.PACKAGE_METADATA_FILE = '.metadata.json';
exports.CNI_ACTIVE_ENV = 'CNI_ACTIVE';
exports.CNI_DONE_MARKER = '.cni-done';
//# sourceMappingURL=defaults.js.map