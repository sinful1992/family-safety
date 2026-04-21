const rnConfig = require('@react-native/eslint-config/flat');

module.exports = [
  ...rnConfig,
  {
    ignores: ['supabase/**', 'node_modules/**'],
  },
];
