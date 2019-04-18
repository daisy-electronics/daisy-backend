const path = require('path');
const CONFIG_PATH = path.resolve('.', process.env.CONFIG || 'daisy.config.js');

try {
  const config = require(CONFIG_PATH);
  module.exports = config;
} catch (error) {
  console.error(`Error while loading configuration from '${CONFIG_PATH}':`, error);
  module.exports = {};
} finally {
  const config = module.exports;
  config.devices = config.devices || {};
}
