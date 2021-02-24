<template lang="slm">
#about.padding-xl.box
	header
		h1 Produpedia
		h2 Lists of everything
	section.padding
		ul#features
			li
				span.count 1,077
				|  categories
			li
				span.count 2,979
				|  attributes
			/ db.product.count()
			li
				span.count 4,204,060
				|  things
			/ db.product.aggregate([{$project:{data:{$objectToArray:"$data"}}},{$unwind: '$data'},{$group:{_id:'$_id','sum':{$sum:1}}},{$group:{_id:null,total_sum:{'$sum':'$sum'}}}], { allowDiskUse: true })
			/ and subtract above product count to remove label values
			li
				span.count 25,262,740
				|  values
	div You can
	section.padding-l.box.column.center
		promise-button.btn :action=show_category_tree
			| Show the category tree
	div: em or
	section.padding-l.box
		global-search
	div: em or
	section.padding-l.box
		| Try out some of these categories:
		ul
			li
				router-link to=/list/cheese
					| List of cheeses
			li
				router-link :to="{ path: '/list/grandPrix', query: { filter: 'location|contains|nürburgring|i', limit: 20, attributes: 21 } }"
					| List of Grand Prixs on the Nürburgring
			li
				router-link :to="{ path: '/list/badmintonPlayer', query: { filter: 'gender|eq|female', attributes: 11, limit: 20 } }"
					| List of female badminton players
			li
				router-link :to="{ path: '/list/pyramid', query: { filter: 'long|lt|-28|i;long|gt|-168|i', limit: 20, attributes: 'thumbnail;label;lat;long;location;yearOfConstruction;type;locatedInArea' } }	"
					| List of pyramids in America
			li
				router-link :to="{ path: '/list/car', query: { filter: 'engine|contains|v8|i;productionStartYear|gt|1800', sort: 'productionStartYear|1', limit: 20, attributes: 20 } }"
					| List of v8 cars, ordered by production year
			li
				router-link to=/list/cat
					| List of cats

	section
		h2 Download data
		p You can download the dataset at the <a href="/static/download.html">Download page</a>.
	section
		h2 Source code
		p All to be found at <a href="https://github.com/produpedia-org/produpedia.org">GitHub</a>. Under <a href="https://github.com/produpedia-org/produpedia.org/issues">issues</a>, you will find pending bugs and todos.
	section
		h2 About the data
		.column.center
			img src="/img/dbpedia.jpg" alt="DBpedia.org logo"
			p
				| The data values on this site origin from a recent DBpedia dataset, which in turn is for the greatest part based on extraced values from Wikipedia article infoboxes. It is available on 
				a href=https://databus.dbpedia.org/dbpedia databus.dbpedia.org.
			p
				| Additionally, the categories were partly restructurized and organized for better discovery. It is right now limited to English values only.
			p
				| Another alternative dataset could be Wikidata, e.g. see a rough <a href="https://w.wiki/$mD">list of cats</a>. Both datasets are significantly different, and Wikidata is arguably a bit of higher quality, extent and growth. That is why the next big step for Produpedia might be to become a dedicated interface for Wikidata, as it also allows for editing. Collaboration on values was one of the primary movtivations for Produpedia but that idea was somewhat suspended because Wikidata comes pretty close.
	section
		h2 About the site
		p
			| When in a list view (table), the URL updates whenever you change filters, sorters, columns or rows. This means you can create a search configuration and easily share the link with others. Columns are draggable and resizable in width. On desktop computers, you can also scroll horizontally by dragging around just like on mobile.
		p
			| Please expect errors and large gaps in the data – it is far from perfect, yet still very useful depending on your use case. The completeness varies from category to category. Also, the tables contain only values from the cleaned "<a href="https://databus.dbpedia.org/dbpedia/mappings">mappings</a>" dataset, not from "<a href="https://databus.dbpedia.org/dbpedia/generic">generic</a>". For example, <a href="/product/Gummy_bear">Gummy bear</a> does not list the attributes "carbs", "fat", "kj", "protein" and "sugars" from <a href="https://dbpedia.org/page/Gummy_bear">https://dbpedia.org/page/Gummy_bear</a>. That is because these "dbr:"-categories are not organized and typically of low quality.
		h3 For developers
		p
			| There is a public API that you can use. Its syntax is not yet super stable, but feel free to query it directly in fair usage (this project is merely hosted on a weak single-core server). For large/frequent computations, please get the database mirror above and work with it locally.<br>
			| The API's syntax is equal to the frontend one. This means that from any visible url beneath <code>/list</code>, you can simply replace the host <code>produpedia.org</code> with <code>api.produpedia.org</code> and should be good to go. Other interesting endpoints are <code>GET /category</code> and <code>GET /attribute?category=[categoryName]</code>, respectively. Check your browser's network tab for XHR requests if interested.
	section
		h2 Contact
		p: address
			a href=mailto:info@produpedia.org info@produpedia.org
	footer.margin-l
		small
			| Last updated: 
			time datetime="2021-02-23" February 23th 2020
			| , version $app_version
</template>

<script lang="coffee">
import { mapState } from 'vuex'
import GlobalSearch from '@/components/GlobalSearch'

export default
	components: { GlobalSearch }
	methods:
		show_category_tree: ->
			if not @$store.getters['category/all_categories_loaded']
				await @$store.dispatch 'category/get_categories_raw'
			@$store.commit 'set_header_open', true
	computed: {
		...mapState
			-	'app_version'
	}
</script>

<style lang="stylus" scoped>
#about
	margin 8px auto
	max-width 600px
	> *
		margin-bottom 20px
ul#features
	font-family monospace
	li
		list-style-type none
		.count
			// font-weight bold
			color var(--color-highlighted)
section.box
	background #fbfcff
</style>
