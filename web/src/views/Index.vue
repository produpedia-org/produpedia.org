<template lang="slm">
.center.padding-xl
	.padding-xl.box
		p Please choose one of the products above!
</template>

<script lang="coffee">
import { mapState } from 'vuex'

export default
	name: 'About'
	computed: {
		...mapState
			-	'app_version'
	}
</script>

<style lang="stylus" scoped>
article
	max-width 600px
</style>
