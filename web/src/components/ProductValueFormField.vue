<template lang="slm">
form-field v-bind="$attrs" v-on="$listeners" :field=form_field
</template>

<script lang="coffee">
export default
	props:
		attribute:
			type: Object
			required: true
	computed:
		form_field: ->
			switch @attribute.type
				when 'string'
					label: 'Value'
					required: true
					pattern: '[^:,]+'
					title: 'Please insert any value. The value cannot contain comma (,) or colon (:).'
					name: 'value'
				when 'number'
					label: "Amount [#{attribute.unit}]" # todo .disabled for unit
					required: true
					type: 'number'
					step: if @attribute.float then 'any' else 1
					min: @attribute.min
					max: @attribute.max
					name: 'value'
				when 'boolean'
					type: 'checkbox' # todo make radio yes/no instead
					name: 'value'
</script>

<style lang="stylus" scoped>
</style>
