const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure all node_modules are resolved
config.resolver.sourceExts.push('cjs', 'mjs');

module.exports = config;

