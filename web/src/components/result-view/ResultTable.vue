<template lang="slm">
table
	thead
		tr
			td
			td.filters v-for="shower_id in shower_ids"
				filters :filters=filters_by_attribute_id[shower_id] :attribute_id=shower_id :readonly=readonly
		tr.attributes :class.drop-target=dragging_column
			th.dropzone.remove.column v-if=dragging_column v-drop=remove_shower
				div ╳
				div.description.danger Hide column
			th v-else=""
			th.dropzone.move v-for="shower_id, index in shower_ids" :key="shower_id+'_'+index" v-drop=move_shower_to(index)
				.attribute.column
					div.actions.center v-if="!readonly && !can_drag"
						button.moveto @click=move_shower_to(index-1)(shower_id) ←
						button.remove @click=remove_shower(shower_id) ╳
						button.moveto @click=move_shower_to(index+2)(shower_id) →
					div.center
						div.row.center v-drag="!readonly && can_drag && shower_id" @dragstart=dragging_column=true @dragend=dragging_column=false
							div.center
								span.grip v-if="!readonly && can_drag" ⠿
							/ FIXME UNIT if number
							div.name $attributes_by_id[shower_id].name
						div.sort.column
							button.sort-up.disabled :disabled=readonly @click="toggle_sort_direction(shower_id, 1)" :class.highlighted=sorters_by_attribute_id[shower_id].direction===1
								/ ˄ todo svg
								| ▲
							button.sort-down.disabled :disabled=readonly @click="toggle_sort_direction(shower_id, -1)" :class.highlighted=sorters_by_attribute_id[shower_id].direction===-1
								/ ˅
								| ▼
						div.sort.small.highlighted v-if="sorters_amount > 1 && sorters_by_attribute_id[shower_id].index >= 0"
							| $sorters_by_attribute_id[shower_id].index+1

	tbody
		tr.product v-for="product in products"
			th.name
				| $product.name
			td.datum v-for="shower_id in shower_ids" @click=datum_clicked(product,shower_id)
				div v-if=product.data[shower_id]
					div v-if=product.data[shower_id].verified
						span.verified
							| $product.data[shower_id].value
						button.edit.disabled v-if=!readonly
							/ ✔ ✓
							| ✎
					div v-else=""
						span.disabled
							| $product.data[shower_id].value
						button.edit v-if=!readonly
							| ✎
				div v-else=""
					span.small
						/ ? &#63;
						|
					button.edit.create v-if=!readonly
						/ 🖉
						| +
</template>

<script lang="coffee">
import Filters from '@/components/result-view/result-table/Filters'

export default Vue.extend
	components: { Filters }
	props:
		readonly:
			default: false
	data: =>
		can_drag: true
		dragging_column: false
	methods:
		toggle_sort_direction: (attribute_id, direction) ->
			@$store.dispatch 'search/toggle_sort_direction', { attribute_id, direction }
		datum_clicked: (product, attribute_id) ->
			if @readonly then return
			@$emit 'datum_clicked', { product, attribute_id }
		move_shower_to: (index) -> (shower_id) =>
			@$store.dispatch 'search/move_shower_to', { shower_id, index }
		remove_shower: (shower_id) ->
			@$store.dispatch 'search/remove_shower', shower_id
	computed: {
		...mapState 'search',
			-	'products'
			-	'shower_ids'
		...mapGetters 'search',
			-	'filters_by_attribute_id'
			-	'sorters_by_attribute_id'
			-	'sorters_amount'
			-	'attributes_by_id'
	}
	mounted: ->
		@can_drag = !(`'ontouchstart' in window` || navigator.maxTouchPoints) # todo "in" in cs? / todo css solution? media query blah
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

// 2. General table styling

th, td
	z-index 1
	min-width 3vw
	max-width 150px
td, th, .attribute // < ? todo
	position relative
th
	position sticky
	background inherit
thead th
	z-index 3
	top 0
	padding 6px
	height 2em
	// background linear-gradient(#fff, 93%, transparent) // weird grey color on firefox, so using this:
	background linear-gradient(#fff, 93%, rgba(255,255,255,0.5))
tbody
	td, th
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
.attributes.drop-target > th.dropzone
	color #246
	&.drop
		&.move
			border-left-fix 2px solid var(--color-highlighted)
		&.remove
			color var(--color-highlighted)
	&.remove .description
		text-transform uppercase
		font-size 80%
.attribute
	padding 1px 6px
	.grip
		font-weight normal
		color var(--color-disabled)
		margin-right 4px
		position relative
		top 1px
	.sort
		padding-left 3px
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
		position absolute
		right 0
		bottom 0
		&.create
			color #A0AB82
	.verified
		color #0B6721

</style>
