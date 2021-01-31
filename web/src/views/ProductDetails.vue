<template lang="slm">
article#product-details.justify-center
	.box.padding-xl.column
		div
			div Details of
			h1 $product_label
			nav#external.flex-base v-if=product
				a v-if="product.source==='dbpedia'" target=_blank :href="'https://en.wikipedia.org/wiki/'+product_name" Wikipedia article
				a v-if="product.source==='dbpedia'" target=_blank :href="'https://dbpedia.org/page/'+product_name" DBpedia page
		div v-if=!product
			| Loading...
		div#infos.column v-else=""
			h2 Categories
			ul#categories.info
				li.capitalize v-for="category_name in product.categories"
					router-link :to="'/list/'+category_name"
						| {{ category_by_name[category_name]&&category_by_name[category_name].label || category_name }}
					small
						|  (
						router-link :to="{path:'/list/'+category_name,query:{filter:'label:eq:'+product_label}}"
							| show in category
						| )
			h2 Aliases
			#aliases.row.info
				div.alias v-for="alias in product.aliases"
					| $alias
			/  verified
			/  source
			h2 Data
			dl#data.info
				div v-for="datum, attribute_name in product.data"
					dt.capitalize
						| {{ attributes_by_name[attribute_name]&&attributes_by_name[attribute_name].label || attribute_name }}
					dd
						pre
							router-link :to="{name:'EditDatum',params:{attribute:attribute_name}}"
								| $datum.value
	popup v-if=show_subroute_modal @close=close_subroute
		router-view
</template>

<script lang="coffee">
import { mapActions, mapState, mapGetters } from 'vuex'
import search_store_module from '@/store/search-store'

export default
	metaInfo: ->
		title: @product_label
	created: ->
		# s.a. result-view
		if not @$store.hasModule('search')
			@$store.registerModule 'search', search_store_module, preserveState: true
	fetch: ({ store, route, redirect }) ->
		if not store.hasModule('search')
			store.registerModule 'search', search_store_module
		product_name = route.params.product
		product = store.getters['search/product_by_name'][product_name]
		get_product = store.dispatch 'search/get_product', product_name
		get_attributes = null
		if not product or Object.keys(product.data).some((attribute_name) => not store.getters['search/attributes_by_name'][attribute_name])
			get_attributes = store.dispatch 'search/get_append_attributes', product: product_name
		get_categories = null
		if not product?.categories?.length or product.categories.some((category_name) => not store.getters['category/category_by_name'][category_name])
			get_categories = store.dispatch 'category/get_categories_raw',
				# This has the potential to duplicate categories in the store, but this does not
				# matter. When the whole tree is loaded, previous ones are disregarded anyway
				# and once the tree is loaded, this doesnt trigger
				options: add: true
				params: product: product_name
		if not product
			# While the requests (may) have already fired, wait for them only on server
			await Promise.all [ get_product, get_attributes, get_categories ]
	data: ->
		show_subroute_modal: false
	methods:
		close_subroute: ->
			@$router.push
				name: 'ProductDetails'
				query: @$router.currentRoute.query
	computed: {
		product_name: ->
			@$route.params.product
		product: ->
			@$store.getters['search/product_by_name'][@product_name]
		product_label: ->
			@product?.data.label?.value or @product_name
		...mapGetters 'category',
			-	'category_by_name'
		...mapGetters 'search',
			-	'attributes_by_name'
	}
	watch:
		$route:
			immediate: true
			handler: (new_route) ->
				@show_subroute_modal = !!new_route.params.attribute
</script>

<style lang="stylus" scoped>
#product-details
	padding 2px 1vw
.box
	gap 10px
	height fit-content
nav#external
	justify-content flex-end
	gap 15px
#infos
	gap 10px
#aliases
	flex-wrap wrap
	gap 0 20px
.info
	max-width 650px
	padding-left 40px
#data
	dt
		font-weight bold
</style>
