module.exports = {
  extends: ['../.eslintrc.js'],
  plugins: ['jest'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'off',
      { varsIgnorePattern: '^_', argsIgnorePattern: '^_', args: 'all' }
    ],
    '@typescript-eslint/no-empty-function': 'off'
  }
}
