module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  env: {
    browser: true,
    node: true
  },
  extends: 'airbnb-base',
  globals: {
    __static: true
  },
  plugins: [
    'html'
  ],
  'rules': {
    'global-require': 0,
    'import/no-unresolved': 0,
    'no-param-reassign': 0,
    'no-shadow': 0,
    'import/extensions': 0,
    'import/newline-after-import': 0,
    'no-multi-assign': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'import/first': 0,
    'no-unused-vars': 0,
    'object-curly-newline': 0,
    'object-shorthand': 0,
    'quotes': 0,
    'radix': 0,
    'import/no-extraneous-dependencies': 0,
    'no-console': 0,
    "no-restricted-syntax": 0,
    'prefer-destructuring': 0,
    'consistent-return': 0,
    'no-underscore-dangle': 0,
    'func-names': 0,
    'arrow-body-style': 0,
    'space-before-function-paren': 0,
    'comma-dangle': 0,
    'max-len': 0,
    'class-methods-use-this': 0,
    'no-eval': 0,
    'no-inner-declarations': 0
  }
}
