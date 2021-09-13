module.exports = {
  extends: ['../../.eslintrc.js', 'plugin:jest/recommended'],
  plugins: ['jest'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'off',
      { varsIgnorePattern: '^_', argsIgnorePattern: '^_', args: 'all' }
    ],
    '@typescript-eslint/no-empty-function': 'off'
  }
}
