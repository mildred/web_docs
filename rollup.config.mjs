export default [
  {
    input: './node_modules/pagedjs/src/polyfill/polyfill.js',
    output: {
      file: 'public/pagedjs-polyfill.js',
      format: 'iife',
      name: 'pagedjs_polyfill',
    }
  }
];
