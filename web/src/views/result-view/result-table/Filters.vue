<template lang="slm">
.filters.column
	.list.column.center
		.filter.box v-for="filter, i in filters"
			filterr :filter=filter :attribute=attribute
	.center
		button.add-filter.disabled v-if=attribute @click=add_filter
			| Filter... 
</template>

<script lang="coffee">
import { mapActions, mapState, mapGetters } from 'vuex'
import Filterr from './filters/Filterr'

export default
	components: { Filterr }
	props:
		filters:
			type: Array
			default: => []
		attribute_name:
			type: String
			default: ''
	methods:
		add_filter: ({ values }) ->
			# Wait for the click outside listeners of other filters to finish
			# see sleep 0 in filterr.vue
			await sleep 0
			@$store.commit 'search/add_filter',
				attribute_name: @attribute_name
				condition: 'contains'
				value: ''
				case_insensitive: true
	computed: {
		attribute: ->
			@$store.getters['search/attributes_by_name'][@$props.attribute_name]
	}
</script>

<style lang="stylus" scoped>
.filters
	.list
		gap 3px
		.filter
			max-width 100%
			padding 3px 5px
	.add-filter
		font-family monospace
		white-space pre
		line-height 1
		font-size 80%
		cursor text
		margin 9px 0 7px
</style>
