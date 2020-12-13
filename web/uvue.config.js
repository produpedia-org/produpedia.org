export default {
	paths: {
		main: './src/vue-app',
	},
	plugins: [
		[
			'@uvue/core/plugins/vuex',
			{
				fetch: true,
			},
		],
		'@uvue/core/plugins/errorHandler',
		'@uvue/core/plugins/middlewares',
		'@/plugins/nav-loader'
	],
	css: {
		// Produpedia is built with accessibility in mind, which is why the page
		// looks rather usable without stylesheets already. And to further
		// increase inital loading time, the css is extracted into a seperate file
		// here. If desired (so that the "ugly" version is never seen on page load),
		// these can be changed to "inline".
		normal: 'extract',
		vue: 'extract',
	}
}