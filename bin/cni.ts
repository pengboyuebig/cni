#!/usr/bin/env node

import { CLI } from '../src/cli/index';

const cli = new CLI();
cli.run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
