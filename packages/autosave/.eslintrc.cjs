module.exports = {
  extends: '../../.eslintrc.js',
  env: {
    browser: true
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'off',
      { varsIgnorePattern: '^_', argsIgnorePattern: '^_', args: 'all' }
    ],
    '@typescript-eslint/no-empty-function': 'off'
  }
}
