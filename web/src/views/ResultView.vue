<template lang="slm">
	div.flex-fill.column.padding-l

		div#readonly-mode
			label
				| Readonly mode
				input type=checkbox v-model=readonly

		div#result-table-container.flex-fill ref=result_table_container tabindex=-1
			result-table#result-table v-if=has_data @datum_clicked=datum_clicked($event) :readonly=readonly
			p.disabled.center v-else="" Loading...

		/ maybe use linus borgs portal instead?
		popup v-if=editing @close=finish_editing
			edit-datum-dialog :product=editing.product :attribute_id=editing.attribute_id

		div.center.margin-l v-if=!readonly
			/ todo add toggle component
			button.btn @click=show_add_product_dialog=true
				| + Add
			add-product-dialog v-if=show_add_product_dialog
</template>

<script lang="coffee">
import search_store_module from '@/store/search-store'

import ResultTable from '@/views/result-view/ResultTable'
import EditDatumDialog from '@/views/result-view/EditDatumDialog'
import AddProductDialog from '@/views/result-view/AddProductDialog'

export default Vue.extend(
	components: { ResultTable, EditDatumDialog, AddProductDialog }
	name: 'ResultView'
	serverPrefetch: -> # note: docs say: You may find the same fetchItem() logic repeated multiple times (in serverPrefetch, mounted and watch callbacks) in each component - it is recommended to create your own abstraction (e.g. a mixin or a plugin) to simplify such code. (todo)
		await @fetch_table_data() # axios networking error handler doesnt display ssr: it modifies another component; this serverPrefetch only cares for ResultView. thus, serverPrefetch errors must (and semantically also should) be handled individually
		# if error, bubble throw: Then dont allow the rendering process to continue. Better to see a page with no data than not seeing any page at all for the user, but status code should really be 500, especially for bots
	data: ->
		show_add_product_dialog: false
		editing: null
		readonly: false
	methods:
		register_search_store: ->
			@$store.registerModule 'search', search_store_module, { preserveState: !!@$store.state.search }
		fetch_table_data: ->
			Promise.all
				-	@$store.dispatch('search/search')
				-	@$store.dispatch('search/get_attributes')
		datum_clicked: (editing) ->
			@editing = editing
		finish_editing: ->
			@editing = null
	computed: {
		has_data: -> !!@$store.state.search?.attributes
	}
	created: ->
		@register_search_store()
	mounted: ->
		@$refs.result_table_container.focus()
		@$store.dispatch 'set_default_focus_target', @$refs.result_table_container
		if !@has_data
			await @fetch_table_data()
	destroyed: ->
		@$store.unregisterModule 'search'
		@$store.dispatch 'set_default_focus_target', null
)
</script>

<style lang="stylus" scoped>
#result-table-container
	@media (min-height 690px)
		// on small devices, dont scroll here, but scroll the entire #app
		// so the space is bigger
		overflow auto
#result-table
	margin 0 auto
	max-width 100%
</style>
