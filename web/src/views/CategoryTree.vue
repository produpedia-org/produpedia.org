<template lang="slm">
div.box
	.preview v-if=!base_category @click=start_get_categories
		ul.category-tree
			li
				div Thing
				ul
					li
						a href=. Activity
						ul
							li
								a href=. Game
								ul
									li
										a href=. Board game
										a href=. Card game
					li
						a href=. Deity
						a href=. Employer
						a href=. Family
		.cloak
		.click-to-expand
			promise-button.prompt :action=get_categories ref=get_categories_btn
				| ↓ Click to expand ↓
	ul.category-tree v-else=""
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
		...mapActions 'category',
			-	'get_categories'
	}
	computed: {
		...mapGetters 'category',
			-	'base_category'
	}
</script>

<style lang="stylus" scoped>
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
		background linear-gradient(to bottom, transparent, transparent, #eee)
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
	--line-height 1.4em
	line-height var(--line-height)
	background var(--color-background)
	>>>
		li, ul, a
			background inherit
		li
			list-style-type none
		a
			position sticky
			--min-row-height var(--line-height)
			display block
		> li > a
			top calc(var(--min-row-height) * 0)
			z-index 999
		> li > ul > li > a
			top calc(var(--min-row-height) * 1)
			z-index 998
		> li > ul > li > ul > li > a
			top calc(var(--min-row-height) * 2)
			z-index 997
		> li > ul > li > ul > li > ul > li > a
			top calc(var(--min-row-height) * 3)
			z-index 996
		> li > ul > li > ul > li > ul > li > ul > li > a
			top calc(var(--min-row-height) * 4)
			z-index 995
		> li > ul > li > ul > li > ul > li > ul > li > ul > li > a
			top calc(var(--min-row-height) * 5)
			z-index 994
</style>
