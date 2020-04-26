<template lang="slm">
section#app.column.fill-h
	popup v-if=authenticate_popup @close=hide_authenticate_popup
		authenticate @authenticated=hide_authenticate_popup
	modal v-if=loading_counter
		.box.padding-l
			| Loading... ($loading_counter)
	header.center
		nav
			| Lists of 
			router-link exact="" to=/p/Smartphone Smartphones
			| , 
			router-link exact="" to=/p/Cheese Cheeses
			| . (Status: DEMO) 
			router-link exact="" to=/about (About)
		nav
			span.session-info v-if=is_logged_in
				span.logged-in-prompt Logged in as 
				span v-if=session.name $session.name
				span v-else-if=session.email $session.email
				span v-else-if=session.external_type $session.external_identifier [$session.external_type]
				| . 
			a href=/privacy.html : small Privacy & Imprint 
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
	> header
		padding 5px 15px
		// border-bottom 1px solid var(--color-secondary-background)
		justify-content space-between
		// nav:not(:last-child), nav > *:not(:last-child) // TODO
		// 	margin-right 1.5vw
		button
			padding 1px 4px
		.session-info
			.logged-in-prompt
				@media (max-width: 600px)
					display none
	> main
		background var(--color-background)
		width 100%
		@media (max-height 780px)
			// So the header is properly overlayed by the sticky table headers
			// on the right when scrolling down when body==scrollcontainer
			// (also see result-view)
			min-width fit-content
		.error
			max-width 100vw
			overflow auto
a.router-link-active
	font-weight bold
</style>

<style lang="stylus" src="./global.stylus"></style>
