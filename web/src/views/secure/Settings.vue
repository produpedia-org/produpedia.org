<template lang="slm">
.center.padding-l
	section#settings.column.center
		h2 Settings
		div
			promise-button.btn onetime="" :action=invalidate_all_tokens
				| Log out on other devices
			read-more
				| All existing sessions (tokens) will be invalidated, effectively logging you out everywhere. But you will stay logged in in this browser until you log out explicitly.
		fieldset
			legend Download your personal data
			p Currently, the only thing this site stores about you is the user account information itself: Your email, and things like your name when you are using Google social login.
			promise-button.btn :action=download_personal_data
				| Download your personal data
		fieldset
			legend.danger Delete your account
			promise-form :action=delete_account
				label.row
					input type=checkbox required=""
					| Confirm deletion
				read-more
					p This action will log you out and remove your user details from the system without trace.
					p Next time you log in, the acount will be created anew.
					p Currently, users cannot really do much in this system, so no valuable data will be lost by deleting your account.
				template #button_label=""
					span.danger Delete your account
</template>

<script lang="coffee">
import { mapState, mapGetters, mapActions } from 'vuex'

export default
	name: 'Settings'
	methods: {
		...mapActions 'session',
			-	'invalidate_all_tokens'
		delete_account: ->
			if not await @$store.dispatch 'confirm_ask', 'Are you sure you want to delete your account?'
				return
			await @$store.dispatch 'session/delete_account'
			@$router.push '/'
		download_personal_data: ->
			# The entire user data is also contained inside the token (=session)
			data = JSON.stringify @session

			blob = new Blob [ data ], { type: 'text/plain' }
			url = window.URL.createObjectURL blob
			a = document.createElement "a"
			document.body.appendChild a
			a.href = url
			a.download = "PersonalData.json"
			a.click()
			window.URL.revokeObjectURL url
			a.remove()
	}
	computed: {
		...mapState 'session',
			-	'session'
	}
</script>

<style lang="stylus" scoped>
#settings
	max-width 600px
	> *
		margin-bottom 5vh
	fieldset
		padding 15px
</style>
