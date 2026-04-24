#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/cli/index");
const cli = new index_1.CLI();
cli.run().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
//# sourceMappingURL=cni.js.map