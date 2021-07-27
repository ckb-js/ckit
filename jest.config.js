module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['packages'],
  testMatch: ['<rootDir>/**/*.spec.ts'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.build.json',
      babelConfig: true,
    },
  },
};
