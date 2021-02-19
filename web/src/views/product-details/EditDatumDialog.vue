<template lang="slm">
div.edit-datum
	h3.capitalize
		em {{attribute&&attribute.label}}
		|  of $product_label
	.text-align-right
		router-link :to="'/product/'+product_name"
			| Go to $product_label detail page ➢
	div v-if="!product||!product.data"
		| Loading...
	div.current v-else=""
		h4 Current value
		p v-if=!datum
			| No value found.
		dl v-else=""
			dt Value
			dd
				pre.value $datum.value

			/ dt Verified status (currently meaningless)
			/ dd
			/ 	pre.verified $datum.verified

			dt Added by user
			dd
				pre.user $datum.user

			dt Source
			dd 
				pre.source
					/ a :href=datum.source $datum.source
					| $datum.source
				read-more v-if="datum.source==='dbpedia'"
					template #summary=""
						| Information about DBpedia data
					article
						section
							h3 DBpedia
							.column.center
								img src="/img/dbpedia.jpg" alt="DBpedia.org logo"
								p
									/ TODO which one? env var
									| This value originates from a recent DBpedia dataset, it is 
									a href=https://databus.dbpedia.org/dbpedia available on databus.dbpedia.org.
							p
								| DBpedia is derived from Wikipedia and is thus distributed under the same licensing terms as Wikipedia, namely the 
								a href="http://en.wikipedia.org/wiki/Wikipedia:Text_of_Creative_Commons_Attribution-ShareAlike_3.0_Unported_License" Creative Commons Attribution-ShareAlike 3.0 license 
								| and the 
								a href="http://en.wikipedia.org/wiki/Wikipedia:Text_of_the_GNU_Free_Documentation_License" GNU Free Documentation License
								| . 
						section
							h3 Edit this value
							p Currently, you can <em>not</em> edit the values on Produpedia.org. You may do so by editing them on Wikidata or Wikipedia.
						/ When deriving another dataset and releasing on the databus:
						/ https://databus.dbpedia.org/dbpedia/mappings/mappingbased-objects/2020.02.01
			
			div v-if=image_url
				dt Image
				dd
					img :src=image_url :alt=image_alt :title=image_alt loading=lazy
</template>

<script lang="coffee">
import { mapActions, mapState, mapGetters } from 'vuex'

export default
	created: ->
		if not @product
			@$store.dispatch 'search/get_product', @product_name
		if not @attribute
			@$store.dispatch 'search/get_attribute', @attribute_name
	methods: {
		...mapActions 'search',
			-	'add_product'
	}
	computed: {
		...mapGetters 'search',
			-	'attributes_by_name'
		product_name: ->
			@$route.params.product
		product: ->
			@$store.getters['search/product_by_name'][@product_name]
		attribute_name: ->
			@$route.params.attribute
		attribute: ->
			@attributes_by_name[@attribute_name]
		datum: ->
			@product?.data[@attribute_name]
		product_label: ->
			@product?.data.label?.value or @product_name
		image_url: ->
			@attribute_name == 'thumbnail' && @datum?.value.replace('width=300','')
		image_alt: ->
			@image_url && @image_url.replace(/^.+\/(.+)\..+/,'$1').replace(/[_-]+/g,' ')
	}
</script>

<style lang="stylus" scoped>
.current
	pre
		margin 0
		display inline-block
img
	max-width 100%
</style>
