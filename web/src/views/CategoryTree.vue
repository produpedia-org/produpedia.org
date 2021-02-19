<template lang="slm">
nav.tree
	/ router-link to=/list/dummy Nonexisting category (for testing purposes)
	.preview v-if=!all_categories_loaded @click=start_get_categories
		ul.category-tree.padding-l
			li
				div Thing
				ul
					li
						div.label: a href=. Activity
						ul
							li
								div.label: a href=. Game
								ul
									li
										div.label: a href=. Board game
										div.label: a href=. Card game
										div.label: a href=. Video game
							li
								div.label: a href=. Sport
								ul
									li
										div.label: a href=. Athletics
										div.label: a href=. Team sports
		.cloak
		.click-to-expand
			promise-button.prompt :action=expand ref=get_categories_btn
				| ↓ Click to expand ↓
	ul.category-tree.padding-l v-else="" v-dragscrollable=""
		category-tree-item v-if=base_category :category=base_category
</template>

<script lang="coffee">
import { mapState, mapGetters, mapActions } from 'vuex'
import CategoryTreeItem from './category-tree/CategoryTreeItem'

export default
	components: { CategoryTreeItem }
	data: ->
		preview: true
	methods: {
		start_get_categories: ->
			@$refs.get_categories_btn.clicked()
		expand: ->
			await @$store.dispatch 'category/get_categories_raw'
			if @$store.state.search?.category
				document.querySelector("#tree-#{@$store.state.search.category}").scrollIntoView
					block: 'center'
					inline: 'nearest'
					behavior: 'smooth'
	}
	computed: {
		...mapGetters 'category',
			-	'base_category'
			-	'all_categories_loaded'
	}
</script>

<style lang="stylus" scoped>
.tree
	overflow auto
.preview
	position relative
	overflow auto
	.cloak
		position absolute
		top 0
		bottom 0
		left 0
		right 0
		z-index 1000
		background linear-gradient(to bottom, transparent 92%, #eee)
		cursor pointer
	.click-to-expand
		position absolute
		bottom 0
		z-index 1001
		width 100%
		text-align center
		.prompt
			background var(--color-background)
			display inline-block
			padding 7px
			margin-bottom 5px
ul.category-tree
	max-height clamp(30vh, 550px, 54vh)
	user-select none // because v-dragscrollable
	line-height 1.65em
	// background white
	width fit-content
	margin 0
	>>>
		li, ul, details, .details, summary
			background white
		li
			list-style-type none
		// Closed
		details > summary
			.label > *
				text-decoration underline
		// Open
		details[open] > summary
			.label > *
				text-decoration unset
			&::-webkit-details-marker, &::marker
				color var(--color-disabled)
		// Both
		details > summary, details[open] > summary
			position sticky
			--min-row-height 1.6em
			&:hover
				&::-webkit-details-marker, &::marker
					color var(--color-clickable)
		.label
			display inline
		> li > details > summary
			top calc(var(--min-row-height) * 0)
			z-index 999
		> li > details > .details > ul > li > details > summary
			top calc(var(--min-row-height) * 1)
			z-index 998
		> li > details > .details > ul > li > details > .details > ul > li > details > summary
			top calc(var(--min-row-height) * 2)
			z-index 997
		> li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > summary
			top calc(var(--min-row-height) * 3)
			z-index 996
		> li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > summary
			top calc(var(--min-row-height) * 4)
			z-index 995
		> li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > summary
			top calc(var(--min-row-height) * 5)
			z-index 994
		> li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > summary
			top calc(var(--min-row-height) * 6)
			z-index 993
		> li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > summary
			top calc(var(--min-row-height) * 7)
			z-index 992
		> li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > summary
			top calc(var(--min-row-height) * 8)
			z-index 991
		> li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > summary
			top calc(var(--min-row-height) * 9)
			z-index 990
		> li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > summary
			top calc(var(--min-row-height) * 10)
			z-index 989
		> li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > details > .details > ul > li > .label
			top calc(var(--min-row-height) * 11)
			z-index 988
</style>
