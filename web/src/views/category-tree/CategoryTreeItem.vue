<template lang="slm">
li
	a.label :href="!category.wrapper && '/product/'+category.name"
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
a.label
	display block
	&:first-letter
		text-transform uppercase
</style>
