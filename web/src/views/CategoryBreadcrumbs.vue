<template lang="slm">
nav
	ol.breadcrumbs.row
		li.segment v-for="segment of path"
			a v-if=!segment.wrapper :href="'/product/'+segment.name" $segment.label
			div v-else="" $segment.label
</template>

<script lang="coffee">
import { mapState, mapGetters, mapActions } from 'vuex'

export default
	data: ->
		path: []
	created: ->
		@generate_path() # todo revise after nuxt integration, and watcher etc
	methods:
		generate_path: ->
			if not @category
				console.log "no category"
				return
			# for some reason, this doesnt work as a computed property here ??._.?
			category_ref = @$store.getters['search/category_ref']
			if category_ref
				# At least some categories are loaded
				i = category_ref
				path = [i]
				while i.parents.length
					if i.parents.length != parents_ref.length
						# Only partially loaded; not enough info for full breadcrumbs
						path = null
						break
					path.unshift i.parents_ref[0]
					i = i.parents_ref[0]
			if not path
				path = await @$store.dispatch 'category/get_categories_raw', 
					options: add: true
					params: breadcrumbs: @category
			@path = path
	computed: 
		category: ->
			@$store.state.search?.category
	watch:
		category:
			# immediate: true
			handler: ->
				@generate_path()
</script>

<style lang="stylus" scoped>
ol.breadcrumbs
	list-style-type none
	padding 0
	margin 0
	.segment
		&:not(:last-child)
			&:after
				content ' > '
		> *
			display inline-block
			&:first-letter
				text-transform uppercase
</style>
