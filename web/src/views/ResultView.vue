<template lang="slm">
	div.flex-fill.column.padding-l

		/ A better semantic element might be `menu`, but it is supported nowhere
		aside#configuration.row.center.padding
			.left
				label
					| Readonly mode
					input type=checkbox v-model=readonly
			.right
				label
					| Rows to load 
					select.limit v-model=limit
						option v-for="l of selectable_limits" :value=l $l
						option :value=-1 All
		
		div#result-table-container.flex-fill ref=result_table_container tabindex=-1 @scroll=on_table_scroll
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
	data: ->
		show_add_product_dialog: false
		editing: null
		readonly: false
		selectable_limits: [ 5, 10, 20, 50, 100, 500, 1000 ]
	methods:
		fetch_table_data: ->
			Promise.all
				-	@$store.dispatch('search/search')
				-	@$store.dispatch('search/get_attributes')
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
	mounted: ->
		@$refs.result_table_container.focus()
		@$store.dispatch 'set_default_focus_target', @$refs.result_table_container
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
