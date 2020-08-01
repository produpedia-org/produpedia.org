<template lang="slm">
promise-form v-bind="$attrs" v-on="$listeners"
	slot name=before
	div.value v-if=!novalue
		/ FIXME: arrays (not boolean)
		label.column v-if="attribute.type==='string'"
			| Value
			input name=value placeholder=Value required=""
		label.column v-else-if="attribute.type==='number'"
			div Amount 
			small.disabled
				| [{{attribute.unit}}]
			input type=number name=value placeholder=Amount :step="attribute.float? 'any' : 1" :min="attribute.min" :max="attribute.max" required=""
		label.column v-else-if="attribute.type==='boolean'"
			input type=checkbox name=value
			/ FIXME: make radio yes/no instead
			| Active
		slot
	/ todo need some kind of legal confirmation for data usage and licensing?
	template #button_label=""
		slot name=button_label
</template>

<script lang="coffee">
import { mapActions, mapState, mapGetters } from 'vuex'

export default
	name: 'ProductValueForm'
	props:
		attribute:
			type: Object
			required: true
		novalue:
			type: Boolean
			default: false
</script>

<style lang="stylus" scoped>
</style>
