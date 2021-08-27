const CracoLessPlugin = require('craco-less');

function getProductionSetting() {
  if (process.env.NODE_ENV !== 'production') return {};
  return {
    presets: ['@babel/preset-env'],
  };
}

module.exports = {
  babel: {
    ...getProductionSetting(),
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
