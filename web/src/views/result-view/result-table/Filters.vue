<template lang="slm">
div
	div.filters.justify-center
		div.filter.box v-for="filter in filters"
			span $condition_by_id[filter.condition].long&nbsp;
			strong.value v-if=filter.value :class.case_sensitive=filter.case_sensitive
				| $filter.value&nbsp;
			button @click=remove_filter(filter) v-if=!readonly ╳
		label.add-filter.justify-center v-if="!show_form && !readonly"
			span.disabled v-if=!filters.length Add filter 
			button.disabled.fade-in @click=show_form=true
				| +
	div.center.column
		popup v-if=show_form @close=show_form=false
			h5 Add a filter:
			h4 {{ attribute.name || 'Product name' }}
			/ TODO btn float right not working? even if this is prmose form directly	
			product-value-form#form :action=add_filter button_float_right="" :attribute=attribute :novalue=!condition_needs_value
				template #before=""
					input type=hidden name=attribute_id :value=attribute_id
					div.condition.padding
						label.column
							| Condition
							select name=condition required="" v-model=condition_id
								/ todo why html not | ?
								option v-for="condition in conditions" :value=condition.id v-html=condition.option_html
				div.condition-value-case-sensitive.padding.row
					label.center v-if=condition_can_be_case_sensitive
						input type=checkbox name=case_sensitive
						| Case sensitive
				template #button_label="" Add
</template>

<script lang="coffee">
import { mapActions, mapState, mapGetters } from 'vuex'
import AttributeSelect from '@/views/AttributeSelect'

export default
	components: { AttributeSelect }
	name: 'ResultTableFilters'
	props:
		filters:
			type: Array
			required: true
		attribute_id:
			type: String
			# This is a little hacky. TODO: Make this component more
			# reusable-y, mostly by moving the actions to the parent component.
			# ResultTable can then decide what to do with a changed filter
			default: 'name'
		readonly:
			default: false
	data: ->
		show_form: false
		condition_id: 'eq'
		# todo: regex
		conditions:
			-	id: 'eq'
				abbr: ' ='
				needs_value: true
			-	id: 'ne'
				abbr: '!='
				long: 'not'
				needs_value: true
			-	id: 'lt'
				abbr: ' &lt;'
				long: 'less than'
				needs_value: true
			-	id: 'gt'
				abbr: ' &gt;'
				long: 'more than'
				needs_value: true
			-	id: 'con'
				abbr: ' ∋'
				needs_value: true
				long: 'contains'
				description: 'contains'
			-	id: 'nu'
				abbr: ' ∅'
				long: 'empty'
			-	id: 'nn'
				abbr: '!∅'
				long: 'not empty'
			.map (condition) =>
				option_html = condition.abbr.replace(/ /g, '&nbsp;')
				option_html += "&nbsp;&nbsp;&nbsp;("
				if condition.description
					option_html += condition.description
				else
					option_html += 'is'
					if condition.long
						option_html += " #{condition.long}"
				if condition.needs_value
					option_html += '...'
				option_html += ')'
				{ ...condition, option_html }
	methods: {
		...mapActions 'search',
			-	'remove_filter'
			-	'add_filter'
	}
	computed: {
		...mapGetters 'search',
			-	'attributes_by_id'
		condition_by_id: -> @conditions.reduce((all, condition) =>
			all[condition.id] = condition
			all
		, {})
		attribute: ->
			@$store.getters['search/attributes_by_id'][@$props.attribute_id] or
				type: 'string'
		condition_needs_value: ->
			@condition_by_id[@condition_id].needs_value
		condition_can_be_case_sensitive: ->
			@condition_needs_value and
				(not @attribute or @attribute.type == 'string')
	}
</script>

<style lang="stylus" scoped>
.filters
	flex-wrap wrap
	font-size 80%
	> *
		margin 3px // TODO: only distance to each other, none to outside
	.filter
		padding 2px 4px
		// background: lightgrey
		white-space pre
		border 1px solid var(--color-highlighted)
		.value
			color var(--color-highlighted)
			display inline-block
			&.case_sensitive:first-letter
				text-decoration underline var(--color-foreground)
	.add-filter
		white-space pre
#form
	max-width 750px
	.attribute-select, .condition-value
		width 155px
	.condition
		select
			width 62px
			font-family monospace
			margin 0 auto
</style>
