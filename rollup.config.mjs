import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');
import typescript from "@rollup/plugin-typescript";

export default {
  input: "./src/index.ts",
  output: [
    {
      format: "cjs",
      file: pkg.main,
    },
    {
      format: "es",
      file:pkg.module,
    },
  ],
  plugins: [typescript()],
};
