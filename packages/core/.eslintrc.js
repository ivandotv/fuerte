module.exports = {
  extends: [
    '../../.eslintrc.js',
    'plugin:jest/recommended',
    'plugin:jest/style'
  ],
  plugins: ['jest'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'off',
      { varsIgnorePattern: '^_', argsIgnorePattern: '^_', args: 'all' }
    ],
    '@typescript-eslint/no-empty-function': 'off'
  }
}
