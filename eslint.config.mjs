import eslintNodeJs from 'super-configs/eslint/node/js';

export default [
  {
    ignores: ['coverage/**', 'node_modules/**'],
  },
  ...eslintNodeJs,
];
