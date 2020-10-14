<template lang="slm">
/ FIXME: make this component a dynamically loaded one
div.edit-datum
	h3
		em $attribute.name 
		| of $product.name
	div.current v-if=datum
		h4 Current value
		dl
			dt Value
			dd
				pre.value $datum.value

			dt Verified status (currently meaningless)
			dd
				pre.verified $datum.verified

			dt Added by user
			dd
				pre.user $datum.user

			dt Source
			dd 
				pre.source
					a :href=datum.source $datum.source
				read-more v-if="datum.source==='dbpedia'"
					template #summary=""
						| Information about DBpedia data
					article
						section
							h3 DBpedia
							.column.center
								img src="/img/dbpedia.jpg" alt="DBpedia.org logo"
								p
									/ TODO which one? env var
									| This value originates from a recent DBpedia dataset, it is 
									a href=https://databus.dbpedia.org/dbpedia available on databus.dbpedia.org.
							p If the source link is dead, this means that the resource originates from <em>after</em> 10/2016 and you cannot access it on the web easily, it is only available on the Databus (see link above) or here.
							p
								| DBpedia is derived from Wikipedia and is thus distributed under the same licensing terms as Wikipedia, namely the 
								a href="http://en.wikipedia.org/wiki/Wikipedia:Text_of_Creative_Commons_Attribution-ShareAlike_3.0_Unported_License" Creative Commons Attribution-ShareAlike 3.0 license 
								| and the 
								a href="http://en.wikipedia.org/wiki/Wikipedia:Text_of_the_GNU_Free_Documentation_License" GNU Free Documentation License
								| . 
						section
							h3 Edit this value
							p Currently, you can <em>not</em> edit the values on Produpedia.org. This will change soon.
						/ When deriving another dataset and releasing on the databus:
						/ https://databus.dbpedia.org/dbpedia/mappings/mappingbased-objects/2020.02.01
	h4 Add new value
	read-more
		template #summary=""
			p Editing is currently NOT supported! Click for more info
		p This is only for demonstration purposes; You can submit values here and they will be saved, but the database will be reset soon.
		p Currently, you can <em>not</em> lastingly edit the values on Produpedia.org. But this will be changed, as the primary goal of this site is to be an open and collaborative effort.
		p Right now, the only way is to participate in the development of the site or edit values in Wikipedia directly. They will then find their way into Produpedia.org eventually.
	product-value-form :action=save_datum :attribute=attribute
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
		attribute_name:
			type: String
			required: true
	methods: {
		...mapActions 'search',
			-	'add_product'
		save_datum: ({ form_data }) ->
			@$store.dispatch 'search/save_datum',
				form_data: form_data
				product: @product
				attribute_name: @attribute_name
	}
	computed: {
		...mapGetters 'search',
			-	'attributes_by_name'
		attribute: ->
			@attributes_by_name[@attribute_name]
		datum: ->
			@$props.product.data[@$props.attribute_name]
	}
</script>

<style lang="stylus" scoped>
.current
	pre
		margin 0
		display inline-block
</style>
