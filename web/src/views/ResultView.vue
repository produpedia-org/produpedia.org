<template lang="slm">
#result-view.flex-fill.column

	/ A better semantic element might be `menu`, but it is supported nowhere
	header.row.center
		aside.left
			.center
				label.row.center
					input type=checkbox v-model=readonly
					div Readonly
		h1
			span.list-of List of $category_plural
		aside.right
			.center
				label.row.center
					div Rows
					select.limit v-model=limit
						option v-for="l of selectable_limits" :value=l $l
						option :value=-1 All
	
	article#result-table-container.flex-fill ref=result_table_container tabindex=-1 @scroll=on_table_scroll
		result-table#result-table v-if=data_fetched @datum_clicked=editing=$event :readonly=readonly
		#load-more.center v-if=data_fetched
			promise-button.btn :action=fetch_next_page :disabled=fetching_next_page Load more
		p.disabled.center v-else="" Loading...
	
	/ maybe use linus borgs portal instead?
	popup v-if=editing @close=editing=null
		edit-datum-dialog :product=editing.product :attribute_name=editing.attribute_name

	div.center.margin-l v-if=!readonly
		/ todo add toggle component
		button.btn @click=show_add_product_dialog=true
			| + Add
		add-product-dialog v-if=show_add_product_dialog
</template>

<script lang="coffee">
import search_store_module from '@/store/search-store'
import { mapActions, mapState } from 'vuex'
import ResultTable from '@/views/result-view/ResultTable'
import EditDatumDialog from '@/views/result-view/EditDatumDialog'
import AddProductDialog from '@/views/result-view/AddProductDialog'

export default
	components: { ResultTable, EditDatumDialog, AddProductDialog }
	metaInfo: ->
		title: @$store.state.search?.category
	created: ->
		if @$isServer
			return
		# Note that after hydration at this point, search state is already populated,
		# but the store *module* does not yet exist, thus the check
		if not @$store.hasModule('search')
			# Unfortunately, with HMR, this mostly happens *before* the destroyed
			# hook, resulting in errors. Doesnt look like there is an easy
			# solution to this besides reloading the site. vue#6518
			# Also, removed destroyed:unregister because it introduces unnecessary bugs
			@$store.registerModule 'search', search_store_module, { preserveState: !!@$store.state.search }
		if not @data_fetched
			await @$store.dispatch 'search/change_category', @$route.params.category
	fetch: ({ store, route }) ->
		if not store.hasModule('search')
			store.registerModule 'search', search_store_module
		await store.dispatch 'search/change_category', route.params.category
	mounted: ->
		@$store.dispatch 'set_default_focus_target', @$refs.result_table_container
		@$store.dispatch 'offer_focus'
	beforeRouteUpdate: (to, from, next) ->
		await @$store.dispatch 'search/change_category', to.params.category
		next()
	data: ->
		show_add_product_dialog: false
		editing: null
		readonly: false
		selectable_limits: [ 5, 10, 20, 50, 100 ]
		is_scrolled_to_bottom: false
		fetching_next_page: false
	methods: {
		on_table_scroll: (event) ->
			ref = event.target
			# Cannot use == 0 here because on some mobile devices there is always 1 pixel left for some reason
			is_scrolled_to_bottom = ref.scrollHeight - ref.scrollTop - ref.clientHeight <= 1
			if not @is_scrolled_to_bottom and is_scrolled_to_bottom
				@fetching_next_page = true
				@$store.dispatch('search/fetch_next_page').then =>
					@fetching_next_page = false
			@is_scrolled_to_bottom = is_scrolled_to_bottom
		...mapActions 'search',
			-	'fetch_next_page'
	}
	computed: {
		data_fetched: -> !!@$store.state.search?.attributes
		limit:
			get: -> @$store.state.search?.limit or 1
			set: (v) -> @$store.dispatch 'search/set_limit', v
		category: ->
			@$store.state.search?.category
		category_plural: ->
			if not @category then return ''
			if @category.match /y$/
				@category.slice(0, -1) + 'ies'
			else
				@category + 's'
	}
	destroyed: ->
		@$store.dispatch 'set_default_focus_target', null
</script>

<style lang="stylus" scoped>
#result-view
	font-size 14px
	padding 0.2vh 1vw 0 1vw
header
	justify-content space-between
	word-break keep-all
	color var(--color-clickable)
	border-bottom 1px solid #a2a9b1
	margin-bottom 8px
	// font-size small
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
	h3
		text-align center
		margin 0 7px
		.list-of
			@media (max-width: 600px)
				display none
#result-table-container
	overflow auto
#result-table
	margin 0 auto
	max-width 100%
#load-more
	position sticky
</style>
