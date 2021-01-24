<template lang="slm">
.filterr
	read-more noliststyle="" v-model=meta.edit ref=read_more
		template #summary=""
			.summary.row v-if=filter_valid
				.summary-expanded
					/ minimize icon. only for visuals, because anything inside .summary collapses
					/ the read-more anyway. Still necessary because without it, it wouldnt not clear
					/ what the × does: collapse or delete
					| 🗕
				.rendered
					span $filter_condition.long&nbsp;
					em.value v-if=filter.value :class.case_sensitive=!filter.case_insensitive
						strong $filter.value
				.summary-expanded
					button.remove @click=remove_filter(filter) ×
			div v-else=""
		.edit
			select.condition v-model=filter_model.condition
				option v-for="condition in conditions" :value=condition.id v-html=condition.option_html
			div v-if="filter_condition&&filter_model_condition.needs_value"
				product-value-form-field.value :attribute=attribute nolabel="" v-model=filter_model.value ref=product_value_form_field
				.case.row v-if=can_be_case_sensitive
					label.center title="Check if uppercase/lowercase matters"
						| Case sensitive 
						input type=checkbox v-model=filter_model.case_sensitive
</template>

<script lang="coffee">
import { mapActions, mapState, mapGetters } from 'vuex'

###
	This is a workaround for a mechanic which I havent been able to understand so far.
	When the first letter is inserted into the .edit.value >>> input, a query_update
	is dispatched and vue router history push with the updated query (one filter value
	will have changed). Then, regardless of the code within result-view/fetch(),
	this component is *destroyed* and re-mounted. This is problematic because the
	.edit is then again collapsed and focus is lost. To preserve edit state, this
	meta map exists.
	The remounting however *only* occurs the first time the filter value is changed,
	on subsequent changes the component is properly reused. I dont know why. I would
	have expected proper reuse all the time because in filters, there is no :key
	specified.
	If this is resolved, this map can be replaced with a local var and doesnt need
	to be synced on mount anymore.
###
meta_by_filter = new Map

value_debouncer = null

export default
	props:
		filter:
			type: Object
			required: true
		attribute:
			type: Object
			required: true
	data: ->
		# todo: regex
		# todo: http://ux.stackexchange.com/q/75704
		conditions =
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
			-	id: 'le'
				abbr: '&lt;='
				long: 'less than or equal to'
				needs_value: true
			-	id: 'gt'
				abbr: ' &gt;'
				long: 'more than'
				needs_value: true
			-	id: 'ge'
				abbr: '&gt;='
				long: 'more than or equal to'
				needs_value: true
			-	id: 'contains'
				abbr: ' ∋'
				needs_value: true
				long: 'contains'
				description: 'contains'
			-	id: 'not_contains'
				abbr: ' ∌'
				needs_value: true
				long: 'not contains'
				description: 'does not contain'
			-	id: 'null'
				abbr: ' ∅' # or ∄ ?
				long: 'empty'
			-	id: 'not_null'
				abbr: '!∅' # or ∃ ?
				long: 'not empty'
			-	id: 'begins_with'
				abbr: ' ^'
				needs_value: true
				long: 'begins with'
				description: 'begins with'
		conditions = conditions
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
		filter_model = JSON.parse(JSON.stringify(@filter))
		if @can_be_case_sensitive
			filter_model.case_sensitive = ! filter_model.case_insensitive
		conditions: conditions
		filter_model: filter_model
		meta:
			edit: false
	methods: {
		...mapActions 'search',
			-	'remove_filter'
		on_open_edit: ->
			# This is not so cool but the simplest way to achieve a focus-on-open behavior
			# because the input is nested two more component layers further down
			input = @$refs.product_value_form_field?.$el.querySelector("input[name=value]")
			if input and input.type == "text"
				input.focus()
				if @filter_model.value
					# Also need to move caret position to the end because by default, the caret
					# would now be at the beginning (or actually, everything would be selected
					# because of onfocus=select() inside form-field, but neither is desirable
					# in this case)
					# Alternatively, this component could be rewritten so that there is no seperate
					# .rendered version but only the .edit one. This way, you'd click the edit input
					# at the desired location yourself
					input.setSelectionRange @filter_model.value.length, @filter_model.value.length
		on_close_edit: ->
			if not @model_valid
				@$store.dispatch 'search/remove_filter', @filter
		document_click_listener: (e) ->
			if not @filter
				return
			if not @$refs.read_more.$el.contains(document.activeElement)
				# Clicked somewhere outside
				@meta.edit = false
				@on_close_edit()
	}
	mounted: ->
		if meta_by_filter.get(@filter)
			@meta = meta_by_filter.get(@filter)
		else
			meta_by_filter.set(@filter, @meta)
		if not @model_valid
			@meta.edit = true
		if @meta.edit
			await @$nextTick()
			@on_open_edit()
		do =>
			# The click listener must not trigger upon .add-filter button click itself
			# but for some reason, $nextTick() does not suffice? -> sleep
			await sleep 0
			document.addEventListener 'click', @document_click_listener
	beforeDestroy: ->
		document.removeEventListener 'click', @document_click_listener
	computed: {
		can_be_case_sensitive: ->
			@attribute.type == 'string'
		filter_condition: ->
			@conditions.find (c) => c.id == @filter.condition
		filter_model_condition: ->
			@conditions.find (c) => c.id == @filter_model.condition
		filter_valid: ->
			@filter_condition and (not @filter_condition.needs_value or @filter.value) # todo [:,]+ stuff, check where when, escape?
		model_valid: ->
			@filter_model_condition and (not @filter_model_condition.needs_value or @filter_model.value) # todo [:,]+ stuff, check where when, escape?
	}
	watch:
		filter_model:
			deep: true
			handler: (new_model, old_model) ->
				clearTimeout(value_debouncer)
				value_debouncer = setTimeout (=>
					if @model_valid
						new_model = { ...new_model }
						if @filter_model_condition.needs_value
							if @can_be_case_sensitive
								new_model.case_insensitive = ! new_model.case_sensitive
						else
							delete new_model.value
							delete new_model.case_insensitive
							delete new_model.case_sensitive
						@$store.dispatch 'search/replace_filter',
							filter: @filter
							model: new_model
					else if new_model.value == ""
						# At start, .value is undefined. Only when set to "", this filter was *updated*
						# to an empty value. It was in the query params but should now be removed
						# from there.
						# This could be achieved by simply dispatching remove_filter, but the current
						# edit window should stay, so we need to add it again afterwards immediately
						# like in filters/add_filter, preserving object reference.
						# This does not seem optimal and should be revised at some point. At least it
						# works great right now. The main challenge with this component is that the
						# queryfilters and searchfilters reflect two different states, yet depend on
						# each other.
						@$store.commit 'search/replace_filter',
							filter: @filter
							model: @filter_model
						@$store.dispatch 'search/remove_filter', @filter
						@$store.commit 'search/add_filter', @filter
				), 400
		meta:
			deep: true
			handler: (meta) ->
				if meta.edit
					@on_open_edit()
				else
					@on_close_edit()
</script>

<style lang="stylus" scoped>
.filterr
	.summary
		justify-content space-between
		.rendered
			white-space pre
			.value
				color var(--color-highlighted)
				font-style unset
				display inline-block
				padding 0 7px
				background var(--color-secondary-background)
				&.case_sensitive:first-letter
					text-decoration underline var(--color-foreground)
		.remove
			&:hover
				color var(--color-error)
		.summary-expanded
			display none
	>>> details[open] .summary-expanded
		display block
.edit
	white-space pre
	select.condition
		font-family monospace
	select.condition, .case
		padding 0
		font-size 80%
	select.condition, .value >>> input
		width 150px
		max-width 100%
	.case
		justify-content flex-end
		input[type=checkbox]
			margin 0
			box-shadow none
</style>
