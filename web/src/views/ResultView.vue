<template lang="slm">
#result-view.flex-fill.column
	/ A better semantic element might be `menu`, but it is supported nowhere
	header.row.center
		aside.left
			.center
		h1.text-align-center $title
		aside.right
			.center
				label.row.center.do-not-print
					div Rows
					select.limit v-model=limit
						option v-for="l of selectable_limits" :value=l $l
						option :value=-1 v-if=max_rows>100 disabled=""
							| $max_rows
	
	/ i Explanation of what this category is..?

	.center
		.box.padding.margin v-for="filter in invisible_filters"
			.error The following filter is hidden:
			span v-if=attributes_by_name[filter.attribute_name]
				| $attributes_by_name[filter.attribute_name].label
			span v-else=""
				| $filter.attribute_name
			b  $filter.condition 
			span $filter.value
		.box.padding.margin v-for="sorter in invisible_sorters"
			.error The following sorting condition is hidden:
			span v-if=attributes_by_name[sorter.attribute_name]
				| $attributes_by_name[sorter.attribute_name].label
			span v-else=""
				| $sorter.attribute_name
			b  $sorter.direction

	article#result-table-container.flex-fill.fade-in v-if=category&&attributes ref=result_table_container tabindex=-1 @scroll=on_table_scroll :disabled=fetching_data
		.center v-if="search_failure||$errorHandler.statusCode===422"
			.box.padding-l.margin-xl
				p v-if=search_failure
					strong.highlighted Search failed!<br>
					span v-if="search_failure==='parallel_arrays'"
						| You tried to sort by multiple attributes that contain products that contain multiple values for that attribute. This is <em>currently not possible</em>. Sorry! We'll try to fix this soon. Please try adjusting your sorters, remove them, or go back one page.
				a :href="'/list/'+category" Go back to $title
		.row
			.flex-fill
				result-table#result-table
				#load-more.center.do-not-print v-if=can_fetch_next_page
					promise-button.btn :action=fetch_next_page :disabled=fetching_next_page Load more
			/ #has-more-attributes.padding.margin-l v-if=has_more_attributes
				| There are 
				span.highlighted $has_more_attributes more attributes
				br
				|  that are currently hidden.
	
	popup v-if=show_subroute_modal @close=close_subroute
		router-view
</template>

<script lang="coffee">
import search_store_module from '@/store/search-store'
import { mapActions, mapState, mapGetters } from 'vuex'
import ResultTable from '@/views/result-view/ResultTable'
import AddProductDialog from '@/views/result-view/AddProductDialog'

export default
	components: { ResultTable, AddProductDialog }
	metaInfo: ->
		title: @title
	created: ->
		# Note that after hydration at this point, search state is already populated,
		# but the store *module* does not yet exist, thus the check
		if not @$store.hasModule('search')
			# Unfortunately, with HMR, this mostly happens *before* the destroyed
			# hook, resulting in errors. Doesnt look like there is an easy
			# solution to this besides reloading the site. vue#6518
			# Also, removed destroyed:unregister because it introduces unnecessary bugs
			@$store.registerModule 'search', search_store_module, preserveState: true
	### Search params parsing. For serialization, see search/update_query ###
	fetch: ({ store, route, redirect, router }) ->
		category = route.params.category
		if category[0] != category[0].toLowerCase()
			return redirect {
				path: "/list/#{category[0].toLowerCase()}#{category.slice(1)}"
				query: route.query
			}, 301
		
		if not store.hasModule('search')
			store.registerModule 'search', search_store_module
		
		if not route.query.attributes?.length or not route.query.limit?
			return redirect
				path: route.path
				query: {
					...route.query
					attributes: store.state.search.columns
					limit: store.state.search.limit	
				}
		
		{ limit, filter = "", sort = "", attributes: show, offset } = route.query
		if limit?
			store.commit 'search/set_limit', limit * 1
		query_filters = (filter
			.split(';').filter(Boolean).map((s)=>s.split('|'))
			.map (s) => {
				attribute_name: s[0]
				condition: s[1]
				value: s[2]
				case_insensitive: s[3] == 'i'
			}) or []
		if JSON.stringify(query_filters) != JSON.stringify(store.state.search.filters)
			store.commit 'search/set_filters', query_filters
		store.commit 'search/set_sorters', (sort
			.split(';').filter(Boolean).map((s)=>s.split('|'))
			.map (s) => {
				attribute_name: s[0]
				direction: s[1] * 1
			}) or []
		if show?
			if Number.isNaN(Number(show))
				store.commit 'search/set_shower_names', (show
					.split(';').filter(Boolean))
				store.commit 'search/set_shower_names_modified', true
			else
				store.commit 'search/set_columns', Number(show)
				# Not necessary (?) because they get repopulated in search/store.
				# If set to [] here, this means that the table completely disappers for the duration of
				# the search because there are no more columns.
				# store.commit 'search/set_shower_names', []
				store.commit 'search/set_shower_names_modified', false
		# Same thing. TODO remove these comments later
		# else
		# 	store.commit 'search/set_shower_names', []
		
		need_search = false
		if store.state.search.category != category
			await store.dispatch 'search/change_category', category
			need_search = true
		else if JSON.stringify(router.currentRoute.query) != JSON.stringify(route.query) # not Object.keys(router.currentRoute.query).every((key) => JSON.stringify(router.currentRoute.query[key]) == JSON.stringify(route.query[key]))
			need_search = true
		if need_search
			await store.dispatch 'search/search',
				query: route.query
		
		# Only for testing purposes
		# await store.dispatch 'category/get_categories_raw'
	mounted: ->
		@$store.dispatch 'set_default_focus_target', @$refs.result_table_container
		@$store.dispatch 'offer_focus'
	beforeRouteLeave: (to, from, next) ->
		@$store.dispatch 'search/change_category', null
		next()
	data: ->
		show_add_product_dialog: false
		selectable_limits: [ 5, 10, 20, 50, 100 ]
		fetching_next_page: false
		show_subroute_modal: false
	methods: {
		on_table_scroll: (event) ->
			if @fetching_next_page or not @can_fetch_next_page
				return
			ref = event.target
			if ref.scrollHeight == ref.clientHeight
				# There is no vertical scrollbar, this is a horizontal scroll
				return
			# Cannot use == 0 here because on some mobile devices there is always 1 pixel left for some reason
			if ref.scrollHeight - ref.scrollTop - ref.clientHeight <= 1
				@fetching_next_page = true
				@$store.dispatch('search/fetch_next_page').then =>
					@fetching_next_page = false
		...mapActions 'search',
			-	'fetch_next_page'
		close_subroute: ->
			@$router.push
				name: 'ResultView'
				query: @$router.currentRoute.query
	}
	computed: {
		limit:
			get: -> @$store.state.search?.limit or 1
			set: (v) -> @$store.dispatch 'search/set_limit', v
		category: ->
			@$store.state.search?.category
		max_rows: ->
			@$store.getters['search/category_ref']?.products_count
		attributes: ->
			@$store.state.search?.attributes
		has_more_attributes: ->
			@$store.getters['search/has_more_attributes']
		category_plural: ->
			if not @category then return ''
			category_label = @$store.getters['search/category_ref']?.label
			if not category_label
				category_label = @category
			if category_label.match /s$/
				category_label
			else if category_label.match /y$/
				category_label.slice(0, -1) + 'ies'
			else
				category_label + 's'
		title: ->
			"List of #{@category_plural}"
		...mapGetters 'search',
			-	'can_fetch_next_page'
			-	'invisible_filters'
			-	'invisible_sorters'
			-	'attributes_by_name'
		...mapState 'search',
			-	'fetching_data'
			-	'search_failure'
	}
	destroyed: ->
		@$store.dispatch 'set_default_focus_target', null
	watch:
		$route:
			immediate: true
			handler: (new_route) ->
				@show_subroute_modal = !!new_route.params.attribute
</script>

<style lang="stylus" scoped>
#result-view
	font-size 14px
	padding 0.2vh 1vw 0 1vw
	color #202122
header
	justify-content space-between
	word-break keep-all
	color var(--color-clickable)
	border-bottom 1px solid #a2a9b1
	margin-bottom 8px
	gap 6px
	aside
		overflow hidden
		flex 1
		text-align center
		label > *
			overflow hidden
			text-overflow ellipsis
	aside.right
		// text-align right
		select, input
			margin-left 6px
	aside.left
		select, input
			margin-right 6px
	select.limit
		padding 2px 0
		text-align-last right
		> option
			direction rtl
#result-table-container
	overflow auto
	@media print
		overflow hidden
#result-table
	margin 0 auto
	max-width 100%
#load-more
	position sticky
	width 100%
	left 0
#has-more-attributes
	position sticky
	top 0
	white-space nowrap
</style>
