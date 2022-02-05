/* eslint-disable @typescript-eslint/no-var-requires */
const { defaults } = require('jest-config');

module.exports = {
  preset: 'solid-jest/preset/node',
  testURL: 'http://localhost/',
  testEnvironment: 'jsdom',
  transform: {
    '\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    'solid-js/web': '<rootDir>/node_modules/solid-js/web/dist/web.cjs',
    'solid-js': '<rootDir>/node_modules/solid-js/dist/solid.cjs',
    'wavesurfer.js/src/plugin/regions':
      '<rootDir>/node_modules/wavesurfer.js/dist/plugin/wavesurfer.regions.js',
    'wavesurfer.js/src/plugin/timeline':
      '<rootDir>/node_modules/wavesurfer.js/dist/plugin/wavesurfer.timeline.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/.erb/mocks/fileMock.js',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
  },
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx', 'json'],
  moduleDirectories: ['node_modules', 'release/app/node_modules'],
  testPathIgnorePatterns: ['release/app/dist'],
  setupFiles: [
    './.erb/scripts/check-build-exists.ts',
    './.erb/scripts/setup-jest.ts',
  ],
};
