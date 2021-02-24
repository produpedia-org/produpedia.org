### Website code for https://produpedia.org

Build with [Vue.js](https://vuejs.org/) 2 and [UVue](https://uvue.yabab.net/) for SSR support.

### How to run

Follow instructions in [.env.development](.env.development), then run `yarn ssr:prepare` to transpile `vue-app.coffee`.

After that, you can use the common yarn scripts `ssr:serve` or `ssr:build` and `ssr:start` as usual. Non-ssr-versions should also work fine. Tests are currently *not* implemented.