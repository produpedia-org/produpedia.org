<template lang="slm">
div.edit-datum
	product-value-form :action=save_datum :attribute=attribute
		template #before=""
			legend
				em $attribute.name 
				| of $product.name
		label.column
			| Source
			input type=url name=source placeholder=Source required=""
</template>

<script lang="coffee">
import { mapActions, mapState, mapGetters } from 'vuex'

export default
	name: 'EditDatumDialog'
	props:
		product:
			type: Object
			required: true
		attribute_id:
			type: String
			required: true
	methods: {
		...mapActions 'search',
			-	'add_product'
		save_datum: ({ form_data }) ->
			@$store.dispatch 'search/save_datum',
				form_data: form_data
				product: @product
				attribute_id: @attribute_id
	}
	computed: {
		...mapGetters 'search',
			-	'attributes_by_id'
		attribute: ->
			@attributes_by_id[@attribute_id]
	}
</script>

<style lang="stylus" scoped>
</style>
