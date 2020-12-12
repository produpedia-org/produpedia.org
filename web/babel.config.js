module.exports = {
  presets: [
    // '@vue/cli-plugin-babel/preset'
    [
      '@vue/cli-plugin-babel/preset',
      {
        // https://github.com/vuejs/vue-cli/issues/6018#issuecomment-743617994
        useBuiltIns: 'entry'
      }
    ]
  ]
}
