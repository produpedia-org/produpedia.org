<template lang="slm">
#app.column.fill-h
	no-ssr
		vue-progress-bar
	confirm
	popup v-if=authenticate_popup @close=hide_authenticate_popup
		authenticate @authenticated=hide_authenticate_popup
	modal v-if=loading_counter
		.box.padding-l
			| Loading... ($loading_counter)
	header
		read-more.hamburger noliststyle="" ref=header_details
			template #summary=""
				.navs.fill.center
					nav.left.row
						.column.center
							div.hamburger ☰
					nav.middle.center
						category-breadcrumbs
					nav.right.row
						router-link.about exact="" to=/ About
			.column.padding-l
				.navs.fill.center
					nav
					nav.right.row.align-center.padding-l
						div.session-info.column
							span v-if=is_logged_in
								span.logged-in-prompt Logged in as 
								span v-if=session.name $session.name
								span v-else-if=session.email $session.email
								span v-else-if=session.external_type $session.external_identifier [$session.external_type]
								| . 
							router-link v-if=is_logged_in exact="" to=/settings Settings 
							button.btn v-if=is_logged_in @click=logout Logout
							button.btn v-if=!is_logged_in @click=show_authenticate_popup
								| Sign in
							a href=/static/privacy.html : small Privacy & Imprint 
				category-tree
	main.flex-fill.column
		div.error v-if=$errorHandler.error
			pre v-if="$errorHandler.statusCode===500"
				| 500 | Unexpected internal Server Error :-( [{{$errorHandler.error.message}}]
			pre v-else=""
				| Error {{$errorHandler.statusCode}} | {{$errorHandler.error.message}}
		div.error.fade-in.column v-if=global_error_message
			pre $global_error_message
			div.center
				promise-button.btn :action=reset_global_error_message
					| Hide
		confirm
		router-view
</template>

<script lang="coffee">
import Authenticate from '@/views/Authenticate'
import CategoryTree from '@/views/CategoryTree'
import Confirm from '@/views/Confirm'
import CategoryBreadcrumbs from '@/views/CategoryBreadcrumbs'
# TODO: requiring a seperate package for this is annoying, solve it manually somehow.
# v-if=!$isServer is not enough for vue-progress-bar
# https://github.com/egoist/vue-client-only/blob/master/src/index.js
import NoSsr from 'vue-no-ssr'
import { mapState, mapGetters, mapActions } from 'vuex'

export default
	components: { NoSsr, Confirm, Authenticate, CategoryTree, CategoryBreadcrumbs }
	metaInfo:
		titleTemplate: (title) =>
			"#{if title then title+' – ' else ''}Produpedia.org"
		# link:
		#	TODO: multiple ssr vue instantiation bug
		# 	-	rel: 'manifest', href: '/manifest.json' # not actually necessary..? pwa seems to also work without the link
		meta:
			-	name: 'description', vmid: 'description', content: 'Detailed lists of everything, Free and Open Data'
			-	name: 'theme-color', content: process.env.VUE_APP_THEME_PRIMARY_COLOR
	created: ->
		if @$isServer
			if @$errorHandler.error
				# Needs extra handling because the error-plugin only catches
				# *unexpected ssr renderer errors* outside fetch(). Here, we
				# consider errors that still allow a full page to be rendered
				# (500 status but no 500.html), probably from inside fetch()
				{ ssr_build_error_report } = await import('@/server/error-plugin')
				await ssr_build_error_report @$errorHandler.error
	computed: {
		...mapState
			-	'app_name'
			-	'loading_counter'
			-	'authenticate_popup'
			-	'global_error_message'
		...mapState 'session',
			-	'session'
		...mapGetters 'session',
			-	'is_logged_in'
	}
	methods: {
		...mapActions
			-	'hide_authenticate_popup'
			-	'show_authenticate_popup'
			-	'reset_global_error_message'
		...mapActions 'session',
			-	'logout'
	}
	watch:
		$route: ->
			@$refs.header_details.$el.removeAttribute 'open'
</script>

<style lang="stylus" scoped>
#app
	> header
		margin 0.5vh 1vw
		.navs
			justify-content space-between
			padding 2px 5px
			box-sizing border-box
			gap 1.5vw
			nav
				overflow hidden
				text-overflow ellipsis
				&.left, &.right
					flex 0 0 auto
					width fit-content
				&.middle
					flex 1 1 0 // = 1
					font-size 12px
					font-family monospace
					text-align center
				&.right
					text-align right
					justify-content flex-end
					align-items center
					.about:visited
						color var(--color-clickable)
			.session-info
				align-items flex-end
		details
			>>> summary
				.navs
					white-space pre
				&:focus
					background-color unset
				.hamburger
					font-size 19pt
					line-height 29px
					padding 0 1vw
					color var(--color-clickable)
					display inline-block
			&[open]
				.hamburger
					color white
					background var(--color-highlighted)
	> main
		background var(--color-background)
		overflow auto
		width 100%
		word-break break-word
		.error
			max-width 100vw
			max-height 61vh
			overflow auto
			button
				font-weight bold
				color var(--color-error)
a.router-link-active
	font-weight bold
</style>

<style lang="stylus" src="./global.stylus"></style>
