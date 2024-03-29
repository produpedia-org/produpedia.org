<template lang="slm">
/ Setting border in case the user disabled CSS
table border=1
	thead
		tr
			td.filters v-for="shower_name in shower_names"
				filters :filters=filters_by_attribute_name[shower_name] :attribute_name=shower_name
		tr.attributes
			th.move v-for="shower_name, index in shower_names" :key="shower_name+'_'+index" v-drop="dragging_column&&move_shower_to(index)" :data-set="attribute=attributes_by_name[shower_name]"
				.attribute.column.center
					.actions.fill-w.align-center.touch-only
						button.moveto @click=move_shower_to(index-1)(shower_name) ←
						button.remove @click=remove_shower(shower_name) ╳
						button.moveto @click=move_shower_to(index+2)(shower_name) →
					div.row.center.flex-fix
						div.row.center.flex-fix v-drag=shower_name @dragstart=dragging_column=true @dragend=dragging_column=false
							div.center.do-not-print
								span.grip.mouse-only ⠿
							.row.flex-fix v-if=attribute
								div.label @click=toggle_sort(shower_name)
									| $attribute.label
								div.unit v-if=attribute.unit
									| $attribute.unit
							div v-else=""
								| $shower_name (empty)
						button.sort.disabled @click=toggle_sort(shower_name)
							/ ▲▼♦♢
							/ TODO: use css background images from https://stackoverflow.com/a/22156412/3779853
							/ but lazily loaded to reduce initial page load
							span.highlighted v-if=sorters_by_attribute_name[shower_name]
								span v-if=sorters_by_attribute_name[shower_name].direction===1
									| ▼
								span v-else=""
									| ▲
							span.do-not-print v-else=""
								| ♢
						div.sort.small.highlighted v-if="sorters_amount > 1 && sorters_by_attribute_name[shower_name]&&sorters_by_attribute_name[shower_name].index >= 0"
							| $sorters_by_attribute_name[shower_name].index+1
		tr.drop-target v-if=dragging_column
			td.remove.center v-drop=remove_shower colspan=9999
				div.padding-l Drop here<br>╳<br>to hide this attribute

	tbody v-dragscrollable="{ scroll_target: scroll_container, on_dragscroll_start, on_dragscroll_end }"
		tr.product v-for="product in products" :key=product.name
			td.datum v-for="shower_name, shower_index in shower_names" @click=datum_clicked(product,shower_name,$event) :data-set="datum=product.data[shower_name]"
				div v-if=datum
					div
						div.thumbnail.loading.center v-if="shower_name==='thumbnail'"
							/ TODO: Find a way to show img loading placeholders without JS: https://stackoverflow.com/q/14748750/3779853
							img alt=Thumbnail :src="datum.value.replace('width=300','width=190')" loading=lazy onload="parentElement.classList.remove('loading')" onerror="parentElement.classList.remove('loading')"
							div.loading-placeholder.center.disabled
								| 🖻<br>loading<br>image
						ul.value.array-value v-else-if=Array.isArray(datum.value) :class.label="shower_name==='label'"
							li v-for="sub_value, sub_i in datum.value"
								div.resource v-if=datum.resource
									router-link v-if="datum.resource[sub_i]&&datum.resource[sub_i].match(/^dbr:/)" :to="'/product/'+datum.resource[sub_i].replace(/^dbr:/,'')"
										| $sub_value
									div v-else=""
										| $sub_value
								div v-else=""
									| $sub_value
						div.value.resource v-else-if=datum.resource
							router-link v-if="datum.resource.match(/^dbr:/)" :to="'/product/'+datum.resource.replace(/^dbr:/,'')"
								| $datum.value
							a v-else="" :href=datum.resource
								| $datum.value
						div.value v-else="" :class.label="shower_name==='label'"
							span v-if="attributes_by_name[shower_name]&&attributes_by_name[shower_name].type==='date'"
								| {{ datum.value | format_date }}
							span v-else=""
								| $datum.value
				div v-else=""
					span.small
						/ ? &#63;
						/ | &nbsp; <- doesnt work?
						|
</template>

<script lang="coffee">
import Filters from '@/views/result-view/result-table/Filters'
import { mapActions, mapState, mapGetters } from 'vuex'
import dayjs from 'dayjs'

export default
	components: { Filters }
	data: =>
		dragging_column: false
		scroll_container: null
		is_scrolling_container: false
	methods: {
		toggle_sort: (attribute_name) ->
			@$store.dispatch 'search/toggle_sort', attribute_name
		datum_clicked: (product, attribute_name, event) ->
			if @is_scrolling_container or event.target.tagName == "A"
				return
			@$router.push
				name: 'EditDatumDialog'
				params:
					product: product.name
					attribute: attribute_name
				query: @$router.currentRoute.query
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
		@scroll_container = @$parent.$refs.result_table_container
	filters:
		format_date: (v) ->
			if (new Date(v)).getTime() / (24*3600*1000) % 1 == 0
				# It's exactly midnight
				dayjs(v).format 'YYYY-MM-DD'
			else
				# The T is ugly, the Z is necessary
				v.toString().replace(/[T]/g,' ')
</script>

<style lang="stylus" scoped>

//////// 1. Setup

// See usage below
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

// 2. General table styling

table
	--separator 1px solid #e3e3e3
	border-collapse collapse
	user-select none // because v-dragscrollable
	--col-min-width 110px
	
table, td, th
	// table html attribute border=1 needs to be reverted again
	border none

thead tr
	&:last-child
		background #eaecf0
th, td, th > *
	min-width var(--col-min-width)
tbody td
	padding 0.5vmin
	word-wrap break-word
	position relative
	cursor move
th
	top 0
	height 2em
	// tbody should flow under thead
	z-index 2
	padding 0
	// rgba() because transparent leads to weird grey color on FF
	background linear-gradient(#eaecf0, 93%, rgba(248 249 250 0.8))
	> *
		padding 2px 0.5vw
		@media not print
			// Very basic column resizing
			// Looks shitty on FF, currently impossible to fix this css-only
			resize horizontal
		overflow hidden
th:nth-child(1), th:nth-child(2)
	z-index 3
td:nth-child(1), td:nth-child(2)
	background var(--color-background)
	z-index 1
	&, /th
		position sticky
		// Bug: sticky + border-collapse + border + on top of other content: border not shown. SO#41882616
		// Remove these four lines once fixed everywhere
		border-right unset !important
		border-right-fix var(--separator)
		border-bottom unset !important
		border-bottom-fix var(--separator)
td, th
	border-bottom var(--separator)
	&:not(:last-child)
		border-right var(--separator)

	// The first two cols should be sticky and on top of the other cols,
	// except on small screens, there only the first col
	&:nth-child(1)
		padding 0
		left 0
		> *
			width 190px
	&:nth-child(2)
		left 190px
	@media (max-width: 950px)
		&:nth-child(1)
			position relative
		&:nth-child(2)
			left 0

// 3. Semantic styling

td.filters
	user-select none
	padding 4px 0
.drop-target
	color #246
.drop-target.move	
	&.dragenter
		border-left-fix 2px solid var(--color-highlighted)
.drop-target .remove
	font-weight bold
	text-align center
	color var(--color-highlighted)
	text-transform uppercase
	white-space nowrap
	&.dragenter
		background var(--color-clickable)
.attribute
	// TODO: Doesnt work on FF, rendering the resize handles even more ugly
	min-height 100%
	.row
		position relative
	.label
		word-break keep-all
		user-select text
		&:first-letter
			text-transform capitalize
	.unit
		color var(--color-disabled)
		white-space nowrap
		margin-left 3px
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
		margin-left 1px
		user-select none
		&:hover
			background var(--color-hover)
	.actions
		justify-content space-evenly
		.remove
			font-size 50%
tr.product
	td.datum
		text-align center
		.verified
			color #0B6721
		ul
			text-align left
			padding-left 1em
			display inline-block
		height 36px
		// max-width unset
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
				z-index -1
			&:not(.loading)
				.loading-placeholder
					display none
			img
				max-height 187px
				max-width 185px
		.value
			&.label
				max-width unset
				width "clamp(var(--col-min-width), 16vw, 160px)" % null

tr.actions
	.load-more
		max-width 100vw
</style>

<style scoped>
/* Possible way to use @-moz-document in stylus? */

/* FF-only selector */
@-moz-document url-prefix() {
	/**** Hacks for FF mobile ****/
	/* This media query is officially supported on FF Android since v83.
	Seems to corretcly apply on very-latest tested 85.0.0-beta.4 S4mini Android11.
	But on some other moto touch Android7, with FF 84.1.4 (the current official playstore version),
	the media query was competely broken, applying (hover:hover) (????).
	The success of below hacks was also not consistent accross these two tested browsers.
	th, td:1,:2, z-index, position:sticky-or-fixed all somehow interfere with each other in
	regards to this performance bug. For example, with both rules removed but with
	td:1,:2{z-index:unset!important}, everything works great (except that the z-index is wrongly
	set of course), but only for the first few rows. After 54 th/tds or so, the rows immediately
	start lagging again. This is all a huge mess and driving me insane */
	@media (hover: none) {
		/* Must *not* set z-index on sticky th or thead because it
		introduces insane lags on weak Firefox mobile devices.
		With this fix, the left sticky column(s) thumbnail/name will overflow
		the table header row which is a bit ugly. */
		th {
			z-index: unset !important;
		}
		/* Those lags also occur for the left sticky column(s) even though these
		dont have a z-index assigned. Maybe because of the `left` property?
		Either way, it is better to not have sticky columns than laggy ones: */
		td:nth-child(1), td:nth-child(2) {
			position: unset !important;
		}
	}
}
</style>