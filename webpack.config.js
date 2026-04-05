const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    content: './src/content.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    fallback: {
      "path": false,
      "fs": false,
      "crypto": false
    }
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'popup.html', to: 'popup.html' },
        { from: 'popup.js', to: 'popup.js' },
        { from: 'popup.css', to: 'popup.css' },
        { from: 'node_modules/@xenova/transformers/dist/*.wasm', to: '[name][ext]' }
      ],
    }),
  ],
};
