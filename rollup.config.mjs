import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import license from "rollup-plugin-license";

export default [
  {
    input: './node_modules/pagedjs/src/polyfill/polyfill.js',
    output: {
      file: 'public/pagedjs-polyfill.js',
      format: 'umd',
      name: "PagedPolyfill",
    },
    plugins: [
      nodeResolve({
        extensions: [".cjs",".mjs", ".js"]
      }),
      commonjs({
        include: "node_modules/**"
      }),
      json(),
      license({
        banner: "@license Paged.js | MIT | https://gitlab.coko.foundation/pagedjs/pagedjs",
      })
    ]
  }
];
