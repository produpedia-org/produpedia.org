<template lang="slm">
/ Setting border in case the user disabled CSS
table border=1
	thead
		tr v-if=dragging_column
			td.dropzone.remove v-drop=remove_shower colspan=9999
				| ╳ Drop<br>to hide
		tr
			td.filters v-for="shower_name in shower_names"
				filters :filters=filters_by_attribute_name[shower_name] :attribute_name=shower_name :readonly=readonly
		tr.attributes :class.drop-target=dragging_column
			th.dropzone.move v-for="shower_name, index in shower_names" :key="shower_name+'_'+index" v-drop=move_shower_to(index)
				.attribute.column.center
					div.actions.center v-if="!readonly && !can_drag"
						button.moveto @click=move_shower_to(index-1)(shower_name) ←
						button.remove @click=remove_shower(shower_name) ╳
						button.moveto @click=move_shower_to(index+2)(shower_name) →
					div.row.center
						div.row.center v-drag="!readonly && can_drag && shower_name" @dragstart=dragging_column=true @dragend=dragging_column=false
							div.center
								span.grip v-if="!readonly && can_drag" ⠿
							div
								div.label $attributes_by_name[shower_name].label
								div.unit v-if=attributes_by_name[shower_name].unit
									| $attributes_by_name[shower_name].unit
						div.sort.column
							button.sort-up.disabled :disabled=readonly @click="toggle_sort_direction(shower_name, 1)" :class.highlighted=sorters_by_attribute_name[shower_name].direction===1
								/ ˄ todo png
								| ▲
							button.sort-down.disabled :disabled=readonly @click="toggle_sort_direction(shower_name, -1)" :class.highlighted=sorters_by_attribute_name[shower_name].direction===-1
								/ ˅
								| ▼
						div.sort.small.highlighted v-if="sorters_amount > 1 && sorters_by_attribute_name[shower_name].index >= 0"
							| $sorters_by_attribute_name[shower_name].index+1

	tbody v-dragscrollable="{ scroll_target: scroll_container, on_dragscroll_start, on_dragscroll_end }"
		tr.product v-for="product in products"
			td.datum v-for="shower_name, shower_index in shower_names" @click=datum_clicked(product,shower_name) :set="datum=product.data[shower_name]"
				div v-if=datum
					/ 	TODO
					/ 	div v-if=datum.verified
					/ 		span.verified
					/ 			| $datum.value
					/ 		button.edit.disabled v-if=!readonly
					/ 			/ ✔ ✓
					/ 			| ✎
					/ 	div v-else=""
					div
						div.thumbnail.loading v-if=shower_index===0
							/ TODO: Find a way to show img loading placeholders without JS: https://stackoverflow.com/q/14748750/3779853
							img alt=Thumbnail :src="datum.value.replace('width=300','width=190')" loading=lazy onload="parentElement.classList.remove('loading')" onerror="parentElement.classList.remove('loading')"
							div.loading-placeholder.center.disabled
								| 🖻<br>loading<br>image
						/ .disabled TODO
						span v-else="" $datum.value
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
		toggle_sort_direction: (attribute_name, direction) ->
			@$store.dispatch 'search/toggle_sort_direction', { attribute_name, direction }
		datum_clicked: (product, attribute_name) ->
			if @readonly or @is_scrolling_container then return
			@$emit 'datum_clicked', { product, attribute_name }
		move_shower_to: (index) -> (shower_name) =>
			@$store.dispatch 'search/move_shower_to', { shower_name, index }
		remove_shower: (shower_name) ->
			@$store.dispatch 'search/remove_shower', shower_name
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
			-	'shower_names'
		...mapGetters 'search',
			-	'filters_by_attribute_name'
			-	'sorters_by_attribute_name'
			-	'sorters_amount'
			-	'attributes_by_name'
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
	user-select none // because v-dragscrollable
	color #202122
tbody td, th
	border-bottom-fix var(--separator)
	&:not(:last-child)
		border-right-fix var(--separator)
table, td, th
	// table html attribute border=1 needs to be reverted again
	border none

// 2. General table styling

thead tr:last-child
	background #eaecf0
tbody tr
	background #f8f9fa
th, td, th > *
	min-width 47px
td
	position relative
	z-index 1
	background #f8f9fa
	max-width 150px
	padding 1vmin
	word-wrap break-word
	&:nth-child(1), &:nth-child(2)
		z-index 2
th
	position sticky
	top 0
	z-index 3
	height 2em
	padding 0
	// background linear-gradient(#eaecf0, 93%, transparent) // weird grey color on firefox, so using this:
	background linear-gradient(#eaecf0, 93%, rgba(248 249 250 0.5))
	> *
		padding 6px 15px
		// Very basic column resizing
		// Looks shitty on Firefox, currently impossible to fix this css-only
		resize horizontal
		overflow hidden
	&:nth-child(1), &:nth-child(2)
		z-index 4
// The first two cols should be sticky and on top of the other cols,
// except on small screens, the only the first col
td, th
	&:nth-child(1), &:nth-child(2)
		position sticky
	&:nth-child(1)
		padding 0
		left 0
	&:nth-child(2)
		left 190px
		min-width 160px
	@media (max-width: 950px)
		&:nth-child(1)
			position relative
			z-index 0
		&:nth-child(2)
			min-width 100px
			left 0

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
	.label
		white-space nowrap
		user-select text
		&:first-letter
			text-transform capitalize
	.unit
		color var(--color-disabled)
		font-size small
		&::before
			content '['
		&::after
			content ']'
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
tr.product
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
		height 36px
		&:first-child
			max-width unset
			.thumbnail
				width 190px
				height 190px
				position relative
				.loading-placeholder
					position absolute
					top 0
					bottom 0
					left 0
					right 0
					font-size 27px
					border 1px solid var(--color-border)
					z-index -1
				&:not(.loading)
					.loading-placeholder
						display none
				img
					max-height 190px

tr.actions
	.load-more
		max-width 100vw
</style>
