module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
    jasmine: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // Allow console.* methods for logging
    'no-console': 'off',
    // Allow class methods that don't use 'this'
    'class-methods-use-this': 'off',
    // Allow dangling underscores for private methods
    'no-underscore-dangle': 'off',
    // Allow reassigning function parameters
    'no-param-reassign': 'off',
    // Allow unused variables that start with underscore
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Allow longer line lengths for readability
    'max-len': ['error', { code: 120 }],
    // Allow empty catch blocks with comment
    'no-empty': ['error', { allowEmptyCatch: true }],
    // Allow for...in loops
    'no-restricted-syntax': 'off',
    // Allow continue statements
    'no-continue': 'off',
    // Allow await inside loops
    'no-await-in-loop': 'off',
    // Disable strict equality for legacy code
    eqeqeq: 'warn',
    // Allow global require() calls
    'global-require': 'off',
    // Allow accessing Object.prototype methods
    'no-prototype-builtins': 'off',
    // Allow for...in without hasOwnProperty check
    'guard-for-in': 'off',
    // Allow prefer-destructuring as suggestion only
    'prefer-destructuring': 'warn',
    // Allow default parameters not to be last
    'default-param-last': 'off',
    // Allow regex constructor
    'prefer-regex-literals': 'off',
    // Allow variable shadowing
    'no-shadow': 'warn',
    // Allow inconsistent return
    'consistent-return': 'off',
    // Allow no-return-await
    'no-return-await': 'warn',
    // Allow camelcase violations for API fields
    camelcase: 'warn',
    // Allow unary operators
    'no-plusplus': 'off',
    // Allow unused expressions (for backward compatibility)
    'no-unused-expressions': 'warn',
    // Allow comma operator
    'no-sequences': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'build/',
    'dist/',
    'examples/',
    'spec/',
    '*.min.js',
  ],
};
