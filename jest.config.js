module.exports = {
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  globals: {
    __DEV__: false, //toggle to true to execute the code in __DEV__ scope
    __VERSION__: 'jest-version',
    __BUILD_DATE__: 'jest-build-date',
    __COMMIT_SHA__: 'jest-commit-sha'
  }
}
