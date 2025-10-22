export default {
  preset: 'ts-jest/presets/default-esm',
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/unit'],
  moduleFileExtensions: ['ts', 'js'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { 
      tsconfig: 'tsconfig.test.json', 
      useESM: true 
    }],
  },
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  coveragePathIgnorePatterns: [
    'test/data/',
    'test/suite/'
  ],
};
