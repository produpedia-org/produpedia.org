<template lang="slm">
.center.padding-xl
	#about.padding-xl.box
		header
			h1 Produpedia
		section
			p
				strong Please choose one of the categories above!
			p Checkout the <a href="https://github.com/produpedia-org/produpedia.org">GitHub repository</a> for more information.
		section
			h2 Contact
			address
				a href=mailto:info@produpedia.org info@produpedia.org
		footer.margin-l
			small
				| Last updated: 
				time datetime="2021-02-05" February 05th 2020
</template>

<script lang="coffee">
import { mapState } from 'vuex'

export default
	computed: {
		...mapState
			-	'app_version'
	}
</script>

<style lang="stylus" scoped>
#about
	max-width 600px
</style>
