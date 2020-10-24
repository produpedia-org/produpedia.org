import VueRouter from 'vue-router'
import Vue from 'vue'

Vue.use VueRouter

export create_router = (store) ->
	router = new VueRouter
		mode: 'history'
		base: process.env.BASE_URL # maybe maybe fixme
		routes:
			-	path: '/'
				name: 'About'
				component: => `import('@/views/About')` # todo this is soon supported natively by cs
			-	path: '/logincallback'
				name: 'LoginCallbackHandler'
				component: => `import('@/views/callback-handlers/LoginCallbackHandler')`
			-	path: '/settings'
				name: 'Settings'
				component: => `import('@/views/secure/Settings')`
				meta:
					requires_auth: true
			-	path: '/product/:category'
				name: 'ResultView'
				component: => `import('@/views/ResultView')`
			-	path: '/p/:category'
				# Backward compatibility with search engine indexing. Remove once not in any cache anymore
				redirect: '/product/:category'
			-	path: '*'
				redirect: '/'
			# corresponding store modules can also be lazyloaded. see ssr vuejs docs
	router.beforeEach (to, from, next) =>
		if to.matched.some (record) => record.meta.requires_auth
			if ! store.getters['session/is_logged_in']
				next
					# Example:
					# Possible redirection to login and further
					# path: '/login'
					# query:
					# 	redirect: to.fullPath # In /login: @$router.push @$route.query.redirect || '/'
					# Here, simply redirect to Index: TODO
					path: '/'
			else
				next()
		else
			next()
	router
