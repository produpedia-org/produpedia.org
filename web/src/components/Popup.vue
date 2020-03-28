<template lang="slm">
modal @close=close
	main.box.padding-xl v-moveable=""
		button#close @click=close ╳
		slot
</template>

<script lang="coffee">
export default
	name: 'Popup'
	methods:
		close: ->
			@$store.dispatch 'offer_focus'
			@$emit 'close'
</script>

<style lang="stylus" scoped>
main
	max-height 98vh
	min-width 50px
	min-height 50px
	position relative
	overflow auto
	box-sizing border-box
#close
	position absolute
	line-height 1em
	top 2em
	right 2em
</style>
