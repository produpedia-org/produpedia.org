import base_crud_store from './base-crud-store'

export default base_crud_store { resource_name: 'category', unique: 'name' },
	getters:
		# thing
		base_category: (state, getters) ->
			getters.categories.find (c) => c.name == "thing"
		categories: (state) ->
			categories = state.categories_raw.map (c) => {...c}
			for c from categories
				c.parents_ref = []
				c.children_ref = []	
			for c from categories
				for d from categories
					if c.parents.includes d.name
						c.parents_ref.push d
						d.children_ref.push c
			categories
		all_categories_loaded: (state, getters) ->
			state.categories_raw.length > 1000
		category_by_name: (state, getters) ->
			getters.categories.reduce((all, category) =>
				all[category.name] = category
				all
			, {})