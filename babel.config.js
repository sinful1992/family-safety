module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
    }],
    ['module-resolver', {
      root: ['./src'],
      extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json', '.node'],
      alias: { '@': './src' },
    }],
    'react-native-reanimated/plugin',
  ],
};
