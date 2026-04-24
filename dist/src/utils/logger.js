"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Logger {
    constructor(verbose = false) {
        this.verbose = verbose;
    }
    setVerbose(verbose) {
        this.verbose = verbose;
    }
    info(msg) {
        console.log(chalk_1.default.blue('i') + ' ' + msg);
    }
    success(msg) {
        console.log(chalk_1.default.green('✓') + ' ' + msg);
    }
    warn(msg) {
        console.log(chalk_1.default.yellow('!') + ' ' + msg);
    }
    error(msg) {
        console.error(chalk_1.default.red('✗') + ' ' + msg);
    }
    debug(msg) {
        if (this.verbose) {
            console.log(chalk_1.default.gray('…') + ' ' + msg);
        }
    }
    plain(msg) {
        console.log(msg);
    }
    heading(msg) {
        console.log('');
        console.log(chalk_1.default.bold(chalk_1.default.cyan(msg)));
    }
    summary(hits, misses, failed, elapsed) {
        console.log('');
        console.log(chalk_1.default.bold('Summary:') +
            ` ${chalk_1.default.green(`${hits} cached`)} | ${chalk_1.default.blue(`${misses} downloaded`)} | ${chalk_1.default.red(`${failed} failed`)}`);
        console.log(`  Time: ${(elapsed / 1000).toFixed(1)}s` +
            (hits > 0 ? chalk_1.default.gray(` (saved from cache)`) : ''));
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map