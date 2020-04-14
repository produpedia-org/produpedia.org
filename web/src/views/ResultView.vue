<template lang="slm">
	div.flex-fill.column.padding-l

		/ A better semantic element might be `menu`, but it is supported nowhere
		aside#configuration.row.center.padding
			.left
				label.center
					| Readonly mode
					input type=checkbox v-model=readonly
			.right
				label
					| Rows to load 
					select.limit v-model=limit
						option v-for="l of selectable_limits" :value=l $l
						option :value=-1 All
		
		div#result-table-container.flex-fill.box ref=result_table_container tabindex=-1 @scroll=on_table_scroll
			result-table#result-table v-if=data_fetched @datum_clicked=editing=$event :readonly=readonly
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
import { mapActions } from 'vuex'
import ResultTable from '@/views/result-view/ResultTable'
import EditDatumDialog from '@/views/result-view/EditDatumDialog'
import AddProductDialog from '@/views/result-view/AddProductDialog'

export default
	components: { ResultTable, EditDatumDialog, AddProductDialog }
	name: 'ResultView'
	serverPrefetch: -> # note: docs say: You may find the same fetchItem() logic repeated multiple times (in serverPrefetch, mounted and watch callbacks) in each component - it is recommended to create your own abstraction (e.g. a mixin or a plugin) to simplify such code. (todo)
		await @fetch_table_data() # axios networking error handler doesnt display ssr: it modifies another component; this serverPrefetch only cares for ResultView. thus, serverPrefetch errors must (and semantically also should) be handled individually
		# if error, bubble throw: Then dont allow the rendering process to continue. Better to see a page with no data than not seeing any page at all for the user, but status code should really be 500, especially for bots
	data: ->
		show_add_product_dialog: false
		editing: null
		readonly: false
		selectable_limits: [ 5, 10, 20, 50, 100, 500, 1000 ]
	methods:
		register_search_store: ->
			@$store.registerModule 'search', search_store_module, { preserveState: !!@$store.state.search }
		fetch_table_data: ->
			await @$store.dispatch 'search/change_subject', @$route.params.subject
		on_table_scroll: (event) ->
			ref = event.target
			is_scrolled_to_bottom = ref.scrollHeight - ref.scrollTop == ref.clientHeight
			if is_scrolled_to_bottom
				@$store.dispatch 'search/fetch_next_page'
	computed:
		data_fetched: -> !!@$store.state.search?.attributes
		limit:
			get: -> @$store.state.search.limit
			set: (v) -> @$store.dispatch 'search/set_limit', v
	created: ->
		@register_search_store()
	beforeRouteUpdate: (to, from, next) ->
		await @$store.dispatch 'search/change_subject', to.params.subject
		next()
	mounted: ->
		@$refs.result_table_container.focus()
		@$store.dispatch 'set_default_focus_target', @$refs.result_table_container
		if !@data_fetched
			await @fetch_table_data()
	destroyed: ->
		@$store.unregisterModule 'search'
		@$store.dispatch 'set_default_focus_target', null
</script>

<style lang="stylus" scoped>
#configuration
	justify-content space-between
	color var(--color-clickable)
	font-size small
	select.limit
		padding 2px 0
		text-align-last right
		> option
			direction rtl
#result-table-container
	@media (min-height 690px)
		// on small devices, dont scroll here, but scroll the entire #app
		// so the space is bigger
		overflow auto
#result-table
	margin 0 auto
	max-width 100%
</style>
