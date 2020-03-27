<template lang="slm">
section#app.column.fill-h
	popup v-if=authenticate_popup @close=hide_authenticate_popup
		authenticate @authenticated=hide_authenticate_popup
	modal v-if=loading_counter
		.box.padding-l
			| Loading... ($loading_counter)
	header.center
		nav.center
			router-link exact="" to=/ [LOGO]
			router-link exact="" to=/p search result
		nav.center
			/ todo
			div.session-info v-if=is_logged_in
				span.logged-in-prompt Logged in as 
				span v-if=session.name $session.name
				span v-else-if=session.email $session.email
				span v-else-if=session.external_type $session.external_identifier [$session.external_type]
			router-link v-if=is_logged_in exact="" to=/settings Settings
			button.btn v-if=is_logged_in @click=logout Logout
			button.btn v-if=!is_logged_in @click=show_authenticate_popup
				| Sign in
	main.flex-fill.column
		div.error.fade-in.column v-if=global_error_message
			pre $global_error_message
			div.center
				promise-button.btn :action=reset_global_error_message
					| Hide
		router-view
</template>

<script lang="coffee">
import { mapState, mapGetters, mapActions } from 'vuex'
import Authenticate from '@/views/Authenticate'

export default
	components: { Authenticate }
	name: 'App'
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
</script>

<style lang="stylus" scoped>
#app
	// necessary because https://stackoverflow.com/a/60794348/3779853
	// (for when #result-table-container overflow is unset)
	overflow auto
	$header-width = 20px
	> header
		z-index 1
		position absolute // only really necessary because horizontal scrolling for when #result-table-container does not scroll
		left 0
		right 0
		height $header-width
		padding 5px 15px
		// border-bottom 1px solid var(--color-secondary-background)
		justify-content space-between
		nav:not(:last-child), nav > *:not(:last-child) // TODO
			margin-right 1.5em
		nav > *
			white-space nowrap
			overflow hidden
			// text-overflow ellipsis
		button
			padding 1px 4px
		.session-info
			.logged-in-prompt
				@media (max-width: 600px)
					display none
	> main
		z-index 2
		background var(--color-background)
		margin-top $header-width + 10px
		width 100%
		min-width fit-content
		.error
			max-width 100vw
			overflow auto
a.router-link-active
	font-weight bold
</style>

<style lang="stylus" src="./global.stylus"></style>
