const CracoLessPlugin = require('craco-less');

module.exports = {
  babel: {
    plugins: ['babel-plugin-styled-components'],
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://47.56.233.149:3083',
        pathRewrite: { '^/api': '' },
      },
    },
  },
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: {
              '@primary-color': '#00CCC0',
              '@border-radius-base': '8px',
              '@btn-border-radius-base': '8px',
            },
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
};
