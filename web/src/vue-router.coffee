import VueRouter from 'vue-router'
import Vue from 'vue'
import V404 from '@/views/404'

Vue.use VueRouter

export create_router = (store) ->
	router = new VueRouter
		mode: 'history'
		base: process.env.BASE_URL
		routes:
			-	path: '/'
				name: 'About'
				component: => `import('@/views/About')` # todo this is soon supported natively by cs
			-	path: '/tree'
				name: 'TreeView'
				component: => `import('@/views/CategoryTreeView')`
			-	path: '/list/:category'
				name: 'ResultView'
				component: => `import('@/views/ResultView')`
				children:
					-	path: 'product/:product/data/:attribute'
						# todo fix names
						name: 'EditDatumDialog'
						component: => `import('@/views/product-details/EditDatumDialog')`
			-	path: '/p/:category'
				# Backward compatibility with search engine indexing. Remove once not in any cache anymore
				redirect: '/list/:category'
			-	path: '/product/:product'
				name: 'ProductDetails'
				component: => `import('@/views/ProductDetails')`
				children:
					-	path: 'data/:attribute'
						name: 'EditDatum'
						component: => `import('@/views/product-details/EditDatumDialog')`
			-	path: '*'
				component: V404
				meta:
					middlewares:
						-	({ ssr }) =>
								if process.server
									ssr.statusCode = 404
			# corresponding store modules can also be lazyloaded. see ssr vuejs docs

	router.beforeEach (to, from, next) =>
		router.app.$errorHandler.error = null
		next()

	router
