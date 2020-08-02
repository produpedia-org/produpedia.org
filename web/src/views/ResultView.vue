<template lang="slm">
article#result-view.flex-fill.column

	/ A better semantic element might be `menu`, but it is supported nowhere
	header.row.center
		aside.left
			.center
				label.row
					input type=checkbox v-model=readonly
					div Readonly
		h3
			span.list-of List of 
			| {{ subject }}s
		aside.right
			.center
				label.row
					div Rows
					select.limit v-model=limit
						option v-for="l of selectable_limits" :value=l $l
						option :value=-1 All
	
	div#result-table-container.flex-fill.box ref=result_table_container tabindex=-1 @scroll=on_table_scroll
		result-table#result-table v-if=data_fetched @datum_clicked=editing=$event :readonly=readonly
		#load-more.center v-if=data_fetched
			promise-button.btn :action=fetch_next_page :disabled=fetching_next_page Load more
		p.disabled.center v-else="" Loading...
	
	/ maybe use linus borgs portal instead?
	popup v-if=editing @close=editing=null
		edit-datum-dialog :product=editing.product :attribute_id=editing.attribute_id

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

make_title = (subject) =>
	"#{if subject then subject+' – ' else ''}Produpedia.org"

export default
	components: { ResultTable, EditDatumDialog, AddProductDialog }
	name: 'ResultView'
	serverPrefetch: -> # note: docs say: You may find the same fetchItem() logic repeated multiple times (in serverPrefetch, mounted and watch callbacks) in each component - it is recommended to create your own abstraction (e.g. a mixin or a plugin) to simplify such code. (todo)
		# axios networking error handler doesnt display ssr: it modifies another component; this serverPrefetch only cares for ResultView. thus, serverPrefetch errors must (and semantically also should) be handled individually
		# if error, bubble throw: Then dont allow the rendering process to continue. Better to see a page with no data than not seeing any page at all for the user, but status code should really be 500, especially for bots
		await @fetch_table_data()
		@$ssrContext.title = make_title @$store.state.search.subject
	created: ->
		@register_search_store()
	beforeRouteUpdate: (to, from, next) ->
		await @$store.dispatch 'search/change_subject', to.params.subject
		document.title = make_title to.params.subject
		next()
	mounted: ->
		@$store.dispatch 'set_default_focus_target', @$refs.result_table_container
		@$store.dispatch 'offer_focus'
		if !@data_fetched
			await @fetch_table_data()
			document.title = make_title @$route.params.subject
	data: ->
		show_add_product_dialog: false
		editing: null
		readonly: false
		selectable_limits: [ 5, 10, 20, 50, 100, 500, 1000 ]
		is_scrolled_to_bottom: false
		fetching_next_page: false
	methods: {
		# todo revise the workflow according to https://github.com/vuejs/vue-ssr-docs/pull/281/files
		register_search_store: ->
			@$store.registerModule 'search', search_store_module, { preserveState: !!@$store.state.search }
		fetch_table_data: ->
			await @$store.dispatch 'search/change_subject', @$route.params.subject
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
			get: -> @$store.state.search.limit
			set: (v) -> @$store.dispatch 'search/set_limit', v
		...mapState 'search',
			-	'subject'
	}
	destroyed: ->
		@$store.unregisterModule 'search'
		@$store.dispatch 'set_default_focus_target', null
		document.title = make_title()
</script>

<style lang="stylus" scoped>
#result-view
	font-family monospace
	font-size 14px
	padding 1vh 1vw 0 1vw
header
	margin-bottom 8px
	justify-content space-between
	word-break keep-all
	color var(--color-clickable)
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
