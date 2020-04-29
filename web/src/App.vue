<template lang="slm">
section#app.column.fill-h
	popup v-if=authenticate_popup @close=hide_authenticate_popup
		authenticate @authenticated=hide_authenticate_popup
	modal v-if=loading_counter
		.box.padding-l
			| Loading... ($loading_counter)
	header
		read-more.hamburger noliststyle=""
			template #summary=""
				.navs.fill.center
					nav
						| (Status: DEMO) 
						| Lists of other things: 
						router-link exact="" to=/p/Smartphone Smartphones
						| , 
						router-link exact="" to=/p/Cheese Cheeses
						| . 
					nav.noshrink.fakelink
						| More...
					nav.right.noshrink.row
						router-link exact="" to=/ (About)
						div.hamburger ☰
			.navs.fill.center
				nav
					| Lists of:
					ul
						li
							router-link exact="" to=/p/Smartphone Smartphones
						li
							router-link exact="" to=/p/Cheese Cheeses
						li
							| ...and much more to come. See 
							router-link exact="" to=/ About
							|  page.
				nav.right.row.center
					div.session-info
						span v-if=is_logged_in
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
	> header
		margin 0.5vh 1vw
		.navs
			justify-content space-between
			padding 2px 5px
			nav
				flex 1
				overflow hidden
				text-overflow ellipsis
				&.right
					text-align right
					justify-content flex-end
					align-items center
				&.noshrink
					flex-shrink 0
		details
			>>> summary
				&:focus
					background-color unset
				.hamburger
					font-size 19pt
					line-height 29px
					padding 0 2vw
		background var(--color-secondary-background)
		border-bottom 1px solid var(--color-disabled)
		button
			padding 1px 4px
		.session-info
			.logged-in-prompt
				@media (max-width: 600px)
					display none // FIXME revise
	> main
		background var(--color-background)
		width 100%
		.error
			max-width 100vw
			overflow auto
a.router-link-active
	font-weight bold
</style>

<style lang="stylus" src="./global.stylus"></style>
