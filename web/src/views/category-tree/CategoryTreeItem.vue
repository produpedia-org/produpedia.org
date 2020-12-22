<template lang="slm">
li
	.label
		a v-if=category.wrapper
			| $category.label
		router-link v-else="" :to="'/product/'+category.name"
			| $category.label
	ul
		category-tree-item v-for="child of category.children_ref" :category=child :key=child.name
</template>

<script lang="coffee">
import { mapState, mapGetters } from 'vuex'

export default
	name: 'category-tree-item'
	props:
		category:
			required: true
			type: Object
</script>

<style lang="stylus" scoped>
.label > a
	display inline-block
	white-space nowrap
	&:first-letter
		text-transform uppercase
</style>
