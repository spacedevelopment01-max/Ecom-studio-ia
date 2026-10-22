// Local build-only hook: the application configuration, typecheck and output are unchanged.
// Disable only Webpack caching when its temporary pack files exceed the test volume.
const Module = require('node:module');
const original = Module._load;
Module._load = function(request, parent, isMain) {
  const value = original.apply(this, arguments);
  if (request === '../webpack-config' && parent?.filename.endsWith('/next/dist/build/webpack-build/impl.js')) {
    return { ...value, __esModule: true, default: async (...args) => {
      const config = await value.default(...args);
      config.cache = false;
      process.stderr.write('MISSION150_WEBPACK_CACHE_DISABLED\n');
      return config;
    }};
  }
  return value;
};
