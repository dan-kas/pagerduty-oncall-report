import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  imports: {
    overrides: {
      'perfectionist/sort-imports': 'off',
    },
  },
}, {

})
