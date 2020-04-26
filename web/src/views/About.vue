<template lang="slm">
.center.padding-xl
	article.padding-xl.box
		header
			h2 Produpedia version $app_version
		section
			p
				strong Please choose one of the categories above!
			p This site is very much still in progress and currently in demo state. The list of subjects (currently only two: Smartphones, Cheese) will be expanded to match most of the buyable entities from <a href="http://mappings.dbpedia.org/server/ontology/classes/">mappings.dbpedia.org/server/ontology/classes</a> and more. Click on individual values in the tables to see details about their origin.
			p Eventually, everything will be editable and verifiable and exportable, and include other datasets too.
			p Checkout the <a href="https://github.com/produpedia-org/produpedia.org">GitHub repository</a> for more information.
		section
			h2 Contact
			address
				a href=mailto:info@produpedia.org info@produpedia.org
		footer.margin-l
			small
				| Last updated by <a href="https://waritschlager.de">Philip Waritschlager</a>: 
				time datetime="2020-04-26" April 26th 2020
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
