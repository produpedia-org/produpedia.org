<template lang="slm">
/ Setting border in case the user disabled CSS
table border=1
	thead
		tr
			td.filters
				filters :filters=name_filters :readonly=readonly
			td.filters v-for="shower_id in shower_ids"
				filters :filters=filters_by_attribute_id[shower_id] :attribute_id=shower_id :readonly=readonly
		tr.attributes :class.drop-target=dragging_column
			th
				.dropzone.remove v-if=dragging_column v-drop=remove_shower
					| ╳ Drop<br>to hide
				div.center v-else=""
					| Name
			th.dropzone.move v-for="shower_id, index in shower_ids" :key="shower_id+'_'+index" v-drop=move_shower_to(index)
				.attribute.column.center
					div.actions.center v-if="!readonly && !can_drag"
						button.moveto @click=move_shower_to(index-1)(shower_id) ←
						button.remove @click=remove_shower(shower_id) ╳
						button.moveto @click=move_shower_to(index+2)(shower_id) →
					div.row.center
						div.row.center v-drag="!readonly && can_drag && shower_id" @dragstart=dragging_column=true @dragend=dragging_column=false
							div.center
								span.grip v-if="!readonly && can_drag" ⠿
							div
								div.name :class.disabled=attributes_by_id[shower_id].messy $attributes_by_id[shower_id].name
								div.unit v-if=attributes_by_id[shower_id].unit
									| $attributes_by_id[shower_id].unit
								div.messy-warning.highlighted v-if=attributes_by_id[shower_id].messy
									| ⚠️ 
									small Messy category
						div.sort.column
							button.sort-up.disabled :disabled=readonly @click="toggle_sort_direction(shower_id, 1)" :class.highlighted=sorters_by_attribute_id[shower_id].direction===1
								/ ˄ todo svg
								| ▲
							button.sort-down.disabled :disabled=readonly @click="toggle_sort_direction(shower_id, -1)" :class.highlighted=sorters_by_attribute_id[shower_id].direction===-1
								/ ˅
								| ▼
						div.sort.small.highlighted v-if="sorters_amount > 1 && sorters_by_attribute_id[shower_id].index >= 0"
							| $sorters_by_attribute_id[shower_id].index+1

	tbody v-dragscrollable="{ scroll_target: scroll_container, on_dragscroll_start, on_dragscroll_end }"
		tr.product v-for="product in products"
			th.name
				| $product.name
			td.datum v-for="shower_id in shower_ids" @click=datum_clicked(product,shower_id) :set="datum=product.data[shower_id]"
				div v-if=datum
					/
						TODO
						div v-if=datum.verified
							span.verified
								| $datum.value
							button.edit.disabled v-if=!readonly
								/ ✔ ✓
								| ✎
						div v-else=""
					div
						/ .disabled TODO
						ul v-if=Array.isArray(datum.value)
							li v-for="value of datum.value"
								| $value
						span v-else=""
							| $datum.value
						button.edit v-if=!readonly
							| ✎
				div v-else=""
					span.small
						/ ? &#63;
						/ | &nbsp; <- doesnt work?
						|
					button.edit.create v-if=!readonly
						/ 🖉
						| +
		tr.actions
			td colspan=100
				div.load-more.center
					/ Fallback in case the autoscroll doesnt work
					/ OR *cannot* work because there is no scroll bar, 
					/ e.g. when there are but a few results
					promise-button.btn :action=fetch_next_page Load more
</template>

<script lang="coffee">
import Filters from '@/views/result-view/result-table/Filters'
import { mapActions, mapState, mapGetters } from 'vuex'

export default
	components: { Filters }
	props:
		readonly:
			default: false
	data: =>
		can_drag: true
		dragging_column: false
		scroll_container: null
		is_scrolling_container: false
	methods: {
		toggle_sort_direction: (attribute_id, direction) ->
			@$store.dispatch 'search/toggle_sort_direction', { attribute_id, direction }
		datum_clicked: (product, attribute_id) ->
			if @readonly or @is_scrolling_container then return
			@$emit 'datum_clicked', { product, attribute_id }
		move_shower_to: (index) -> (shower_id) =>
			@$store.dispatch 'search/move_shower_to', { shower_id, index }
		remove_shower: (shower_id) ->
			@$store.dispatch 'search/remove_shower', shower_id
		...mapActions 'search',
			-	'fetch_next_page'
		on_dragscroll_start: ->
			@is_scrolling_container = true
		on_dragscroll_end: ->
			@is_scrolling_container = false
	}
	computed: {
		...mapState 'search',
			-	'products'
			-	'shower_ids'
		...mapGetters 'search',
			-	'filters_by_attribute_id'
			-	'name_filters'
			-	'sorters_by_attribute_id'
			-	'sorters_amount'
			-	'attributes_by_id'
	}
	mounted: ->
		@can_drag = !(`'ontouchstart' in window` || navigator.maxTouchPoints) # todo "in" in cs? / todo css solution? media query blah
		@scroll_container = @$parent.$refs.result_table_container
</script>

<style lang="stylus" scoped>

//////// 1. Borders

// Bug: sticky + border-collapse + border: border not shown. SO#41882616. todo: remove and change to plain border once fixed everywhere (lol).
border-base-fix()
	&::after
		content ''
		position absolute
		bottom 0
		z-index -1
border-right-fix()
	border-base-fix()
	&::after
		border-right arguments
		height 100%
		right 0
border-left-fix()
	border-base-fix()
	&::after
		border-left arguments
		height 100%
		left 0
border-bottom-fix()
	border-base-fix()
	&::after
		border-bottom arguments
		width 100%
		right 0
border-fix()
	border-right-fix(arguments)
	border-left-fix(arguments)
	border-bottom-fix(arguments)
table
	--separator 1px solid #e3e3e3
	border-collapse collapse
tbody td, th
	border-bottom-fix var(--separator)
	&:not(:last-child)
		border-right-fix var(--separator)
table, td, th
	// table html attribute border=1 needs to be reverted again
	border none

// 2. General table styling

th, td, th > *
	z-index 1
	min-width 5vw
td, th
	position relative
th
	position sticky
	background inherit
thead th
	z-index 3
	top 0
	&:first-child
		z-index 4
		left 0
	height 2em
	padding 0
	// background linear-gradient(#fff, 93%, transparent) // weird grey color on firefox, so using this:
	background linear-gradient(#fff, 93%, rgba(255,255,255,0.5))
	> *
		padding 6px 15px
		// Very basic column resizing
		resize horizontal
		overflow hidden
		height 100%
tbody
	td, th
		max-width 150px
		padding 1vmin
		word-wrap break-word
	th
		z-index 2
		left 0
	tr
		td
			background #fff
		th
			// same workaround as above, and now horizontally
			background linear-gradient(to right, #fff, 93%, rgba(255,255,255,0.5))
		&:nth-child(odd)
			td
				background var(--color-secondary-background)
				&:last-child
					background linear-gradient(to right, var(--color-secondary-background), 90%, #fff)
			th
				background linear-gradient(to right, #fff, 10%, var(--color-secondary-background), 93%, rgba(255,255,255,0.5))

// 3. Semantic styling

.filters
	z-index 9 // so filter modal shows above other tds/ths with z-index above
	user-select none
.attributes.drop-target .dropzone
	color #246
	&.drop
		&.move
			border-left-fix 2px solid var(--color-highlighted)
		&.remove
			color var(--color-highlighted)
	&.remove
		text-transform uppercase
		color var(--color-highlighted)
		white-space nowrap
		&.drop
			background var(--color-hover)
.attribute
	.row
		position relative
	.name
		white-space nowrap
		user-select text
	.unit
		color var(--color-disabled)
		font-size small
		&::before
			content '['
		&::after
			content ']'
	.messy-warning
		white-space nowrap
	.grip
		font-weight normal
		color var(--color-disabled)
		margin-right 4px
		position relative
		top 1px
		/[draggable=true]
			&:hover
				.grip
					color var(--color-clickable)
					text-shadow 2px 2px 2px var(--color-clickable)
	.sort
		padding-left 3px
		user-select none
		.sort-up, .sort-down
			&:hover
				background var(--color-hover)
		.sort-up
			position relative
			top -5px
		.sort-down
			position absolute
			bottom -4px
	.actions
		height 8px
		.remove
			font-size 50%
			margin 0 13px
td.datum
	text-align center
	button.edit
		user-select none
		position absolute
		right 0
		bottom 0
		&.create
			color #A0AB82
	.verified
		color #0B6721
	ul
		text-align left
		padding-left 1em
		display inline-block
		margin 0
tr.actions
	.load-more
		max-width 100vw
</style>
