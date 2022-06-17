/* eslint-disable @typescript-eslint/no-var-requires  */
const baseConfig = require('../../jest.config.js')

module.exports = {
  ...baseConfig,
  rootDir: '.',
  projects: undefined,
  testMatch: ['<rootDir>/src/**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverageFrom: [
    '<rootDir>/src/**',
    '!<rootDir>/src/index.ts',
    '!<rootDir>/src/__tests__/**',
    '!<rootDir>/src/scratch/**',
    '!<rootDir>/src/**/__tests__/**',
    '!<rootDir>/src/**/__fixtures__/**',
    '!<rootDir>/src/transport/transport.ts',
    '!<rootDir>/src/**/*.d.ts'
  ]
}
