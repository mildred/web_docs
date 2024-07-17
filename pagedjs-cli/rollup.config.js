// rollup.config.js
// import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/cli.js',
  output: {
    file: "pagedjs.js",
    entryFileNames: 'pagedjs-[name].js'
  },
  // plugins: [nodeResolve()]
};
