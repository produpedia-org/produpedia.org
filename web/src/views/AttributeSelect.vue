<template lang="slm">
div.column
	input#quicksearch type=search v-model=filter placeholder="Quick search..."
	/ todo use datalist some day when its supported widely enough
	select :name=name :required=required
		option v-for="filtered_attribute in filtered_attributes" :value=filtered_attribute.name
			| $filtered_attribute.name
</template>

<script lang="coffee">
import { mapActions, mapState, mapGetters } from 'vuex'

export default
	name: 'AttributeSelect'
	props:
		attribute_names:
			type: Array
			required: true
		name:
			type: String
			default: 'attribute_name'
		required:
			type: Boolean
			default: false
	data: ->
		filter: ''
	computed: {
		...mapGetters 'search',
			-	'attributes_by_name'
		attributes: ->
			@attribute_names.map (id) => @attributes_by_name[id]
		filtered_attributes: ->
			@attributes.filter (a) => a.name.includes(@filter)
	}
</script>

<style lang="stylus" scoped>
#quicksearch
	padding 0
	color grey
	margin-bottom 0
</style>
