<template lang="slm">
section#app.column.fill-h
	confirm
	popup v-if=authenticate_popup @close=hide_authenticate_popup
		authenticate @authenticated=hide_authenticate_popup
	modal v-if=loading_counter
		.box.padding-l
			| Loading... ($loading_counter)
	header
		read-more.hamburger noliststyle=""
			template #summary=""
				.navs.fill.center
					nav.left
						div.hamburger ☰
						/ /| Lists of things: 
						/ router-link exact="" to=/p/Smartphone Smartphones
						/ | , 
						/ router-link exact="" to=/p/Cheese Cheeses
						/ / | . 
					nav.middle
						/ / em.fakelink Click for more...
						/ router-link exact="" to=/p/Smartphone Smartphones
						/ | , 
						/ router-link exact="" to=/p/Cheese Cheeses
						/ | $categories
						| Categories
					nav.right.row
						router-link exact="" to=/ About
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
import CategoryTree from '@/views/CategoryTree'
import Confirm from '@/views/Confirm'

export default
	components: { Confirm, Authenticate, CategoryTree }
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
		...mapState 'category',
			-	'categories'
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
			box-sizing border-box
			nav
				overflow hidden
				text-overflow ellipsis
				&.left
					flex 1
				&.middle
					font-family monospace
					font-size 16px
					text-align center
				&.right
					flex 1
					text-align right
					justify-content flex-end
					align-items center
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
					margin 0 1vw
					padding 0 1vw
					color var(--color-clickable)
					display inline-block
			&[open]
				.hamburger
					color white
					background var(--color-highlighted)
			background var(--color-secondary-background)
	> main
		background var(--color-background)
		overflow auto
		width 100%
		word-break break-word
		.error
			max-width 100vw
			overflow auto
a.router-link-active
	font-weight bold
</style>

<style lang="stylus" src="./global.stylus"></style>
