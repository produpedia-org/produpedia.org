<template lang="slm">
.global-search.column
	.row.center
		div.flex-fill Search for any thing or category
		read-more noliststyle="" v-model=show_help
			template #summary=""
				.btn.help type=button ?
			popup @close=show_help=false
				p
					| You can specify multiple search terms, seperated by spaces. If all of these are found, the results are shown.<br>
					| To exclude search terms, prepend them with a dash (-text).<br>
					| Search is case insensitive.<br>
					| The search is language-aware (English only) and does some magic with stopwords and stemming.<br>
					| To see details about the implementation, visit the <a href="https://docs.mongodb.com/manual/reference/operator/query/text/#match-operation" target="_blank">docs of the underlying database mongoDB</a>.<br>
					| (All words are automatically surrounded with quotes so it becomes a match-all instead of match-any)
	input type=search placeholder="Start typing..." v-model=query
	.box.padding-l
		div v-if=result&&result.categories&&result.categories.length
			h3 Matching categories
			h4 Click on the category name to see the list
			ul.categories
				li.padding v-for="category of result.categories"
					router-link.link.capitalize :to="'/list/'+category.name"
						| $category.display_name
						small.disabled v-if=category.alias
							|  ({{ category.alias }})
					small
						|  (
						a href=#
							promise-button :action=scroll_category_into_view(category.name)
								| show in tree
						| )
		div v-if=result&&result.products&&result.products.length
			h3 Matching things
			ul.products
				li.padding.row v-for="product of result.products"
					.thumbnail
						img v-if=product.thumbnail :src=product.thumbnail.replace('width=300','width=70') alt=Thumbnail loading=lazy
					router-link.capitalize :to="'/product/'+product.name"
						| $product.display_name
				li v-if="result.products.length===250"
					| Maximum search size of 250 reached. Please refine your search term to be more specific.
		div v-else-if=result
			| No matching things found!
		div.disabled v-else-if=query
			| Loading...
</template>

<script lang="coffee">
query_debouncer = null

export default
	data: ->
		show_help: false
		query: ''
		last_query: ''
		result: null
	methods:
		scroll_category_into_view: (category_name) -> =>
			if not @$store.getters['category/all_categories_loaded']
				await @$store.dispatch 'category/get_categories_raw'
			@$store.commit 'set_header_open', true
			await sleep 0
			tree_el = document.querySelector("#tree-#{category_name}")
			tree_el.scrollIntoView
				block: 'center'
				inline: 'nearest'
			tree_el.classList.add('highlighted')
			# await sleep 3000
			# tree_el.classList.remove('highlighted')
	watch:
		query: (query) ->
			clearTimeout(query_debouncer)
			query_debouncer = setTimeout (=>
				if query == @last_query
					return
				@last_query = query
				@result = null
				@result = (await @$http.get 'search',
					params: { query }).data
			), 400
</script>

<style lang="stylus" scoped>
input[type=search]
	padding 18px 25px
	font-size 110%
.global-search
	gap 8px
.btn.help
	padding 0 2px
	margin-left 10px
.categories
	.link
		display inline-block
.products
	max-height 450px
	overflow auto
	.thumbnail
		flex-shrink 0
		text-align center
		width 70px
		height 70px
		margin-right 10px
		> img
			max-height 70px
ul
	padding-left 10px
ul > li
	list-style-type none
	&:nth-child(even)
		background: #eee
</style>
