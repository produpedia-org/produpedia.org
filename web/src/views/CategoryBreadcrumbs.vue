<template lang="slm">
div.path-to-category
	ol.breadcrumbs.row.center
		li.segment v-for="category of category_breadcrumbs_ref"
			router-link v-if=!category.wrapper :to="'/product/'+category.name" $category.label
			div v-else="" $category.label
</template>

<script lang="coffee">
import { mapState, mapGetters, mapActions } from 'vuex'

export default
	computed:
		category_breadcrumbs_ref: ->
			@$store.state.search?.category_breadcrumbs_ref
</script>

<style lang="stylus" scoped>
ol.breadcrumbs
	list-style-type none
	padding 0
	margin 0
	.segment
		&:not(:last-child)
			&:after
				content ' > '
		> *
			display inline-block
			&:first-letter
				text-transform uppercase
</style>
