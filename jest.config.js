module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['packages'],
  testMatch: ['<rootDir>/**/CellOutPointProvider.spec.ts'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.build.json',
      babelConfig: true,
    },
  },
  globalSetup: '<rootDir>/packages/ckit/src/__tests__/jestGlobalSetup.ts'
};
