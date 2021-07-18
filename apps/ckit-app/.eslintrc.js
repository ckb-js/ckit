module.exports = {
  extends: [require.resolve('../../.eslintrc.js'), 'react-app', 'react-app/jest'],
  settings: { 'import/resolver': { node: { paths: ['src'] } } },
};
