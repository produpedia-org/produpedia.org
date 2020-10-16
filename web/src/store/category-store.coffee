import axios from 'axios'

export default
	namespaced: true
	state: =>
		categories: []
	getters:
		# Thing
		base_category: (state) ->
			state.categories[state.categories.length-1]
	mutations:
		set_categories: (state, categories) ->
			state.categories = categories
	actions:
		get_categories: ({ commit }) ->
			response = await axios.get 'category'
			categories = response.data
			for c from categories
				c.parents_ref = []
				c.children_ref = []
			for c from categories
				for d from categories
					if c.parents.includes d.name
						c.parents_ref.push d
						d.children_ref.push c
			commit 'set_categories', categories