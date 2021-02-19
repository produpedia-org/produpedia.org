<template lang="slm">
form-field v-bind="$attrs" v-on="$listeners" :field=form_field @keypress=validate($event)
</template>

<script lang="coffee">
export default
	props:
		attribute:
			type: Object
			required: true
	methods:
		validate: (event) ->
			if String.fromCharCode(event.keyCode).match(/[\|;]/)
				event.preventDefault()
	computed:
		form_field: ->
			switch @attribute.type
				when 'number'
					label: "Amount#{if @attribute.unit then ' ['+@attribute.unit+']' else ''}" # todo .disabled for unit
					required: true
					type: 'number'
					step: if @attribute.float then 'any' else 1
					min: @attribute.min
					max: @attribute.max
					name: 'value'
				when 'boolean'
					type: 'checkbox' # todo make radio yes/no instead
					name: 'value'
				else
					label: 'Value'
					required: true
					pattern: '[^:,]+'
					title: 'Please insert any value. The value cannot contain comma (,) or colon (:).'
					name: 'value'
</script>

<style lang="stylus" scoped>
</style>
