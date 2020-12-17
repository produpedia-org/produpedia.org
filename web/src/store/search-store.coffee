import storage_service from '@/services/storage-service'
import axios from 'axios'
import Vue from 'vue'

###
# Search request

A search request consists out of user-defined request modifiers:
- `category`: string
	What to search for
- `filters`: {} - optional
	Attributes to filter by
- `sorters`: {} - optional
	Attributes to sort with
- `showers`: [] - optional
	Attributes to be included in the result product data: [`shower1`, `shower2`, ... `showerN`]
	Each product data result (row) will include max(N, columns) entries (cols).
	Showers are what the server sent, and may be configured by the user (add / remove / move cols around, maybe in order to sort / filter by them or jff)
- `columns`: number
	Amount of attributes to respond with. If <= showers, ignored.
	If < 1, no values will be returned
- `limit`: number
	Amount of products to respond with
- `offset`: number
	Amount of products to skip in request

# Search result (answer)

Result contains product values at [...showers]. filters and sorters are part of showers, defined seperately.
with showers = (`shower1`, `shower2`, ... `showerN`)

Query response:
- `result`:
	`showers`: []
	`products`: []

In the frontend, the columns (attibutes) to be displayed are determined by
`showers`

---
Seperate query:
- attributes: []
	All attributes there are (maybe make this dynamic one day for when there are a lot of them)

overview to avoid duplicate lists:

- filters, sorters, showers
- sorters_by_attribute
- sorters_amount

- attributes
- attributes_by_id
- hidden_attributes

attributes = showers + hidden

###
export default
	namespaced: true
	state: =>
		### static ###
		#
		### (optionally) user-defined ###
		category: ''
		filters: [
		]
		shower_names: []
		sorters: [
		]
		columns: 1000
		limit: 20
		offset: 0
		### server response; readonly ###
		attributes: null
		products: null
		### other ###
		reached_the_end: false
	getters:
		attribute_names: (state) ->
			state.attributes.map (a) => a.name # todo add map('str') prototype
		attributes_by_name: (state) ->
			state.attributes.reduce((all, attribute) =>
				all[attribute.name] = attribute
				all
			, {})
		sorters_by_attribute_name: (state, getters) ->
			getters.attribute_names.reduce((all, attribute_name) =>
				sorter_index = state.sorters.findIndex((sorter) => sorter.attribute_name == attribute_name)
				if sorter_index > -1
					all[attribute_name] =
						index: sorter_index
						direction: state.sorters[sorter_index].direction
				else
					all[attribute_name] = {}
				all
			, {})
		filters_by_attribute_name: (state, getters) ->
			getters.attribute_names.reduce((all, attribute_name) =>
				all[attribute_name] = state.filters.filter (filter) => filter.attribute_name == attribute_name
				all
			, {})
		sorters_amount: (state) -> state.sorters.length
		# todo docs belong here not top
		hidden_attribute_names: (state, getters) ->
			getters.attribute_names
				.filter (attribute_name) =>
					!state.showers.includes attribute_name
		category_ref: (state, getters, rootState, rootGetters) ->
			rootGetters['category/categories'].find (c) =>
				c.name == state.category
	mutations:
		set_category: (state, category) -> state.category = category
		remove_sorter_at: (state, index) -> Vue.delete state.sorters, index
		add_sorter: (state, sorter) -> state.sorters.push sorter
		set_sorters: (state, sorters) -> state.sorters = sorters
		set_products: (state, products) -> state.products = products
		add_product: (state, product) -> state.products.push product
		add_products: (state, products) -> state.products.push ...products
		add_product_datum: (state, { product, attribute_name, datum }) ->
			Vue.set product.data, attribute_name, datum
		set_shower_names: (state, shower_names) -> state.shower_names = shower_names
		remove_shower_name_at: (state, index) -> Vue.delete state.shower_names, index
		remove_shower_name: (state, shower_name) -> Vue.delete state.shower_names, state.shower_names.indexOf(shower_name) # todo add prototy .remove method
		add_shower_name_at: (state, { index, shower_name }) -> state.shower_names.splice index, 0, shower_name # todo ^
		set_attributes: (state, attributes) ->
			state.attributes = attributes
		add_filter: (state, filter) -> state.filters.push filter
		remove_filter: (state, filter) -> Vue.delete state.filters, state.filters.indexOf(filter)
		set_filters: (state, filters) -> state.filters = filters
		set_columns: (state, columns) -> state.columns = columns
		set_limit: (state, limit) -> state.limit = limit
		set_offset: (state, offset) -> state.offset = offset
		end_reached: (state) -> state.reached_the_end = true
		end_not_yet_reached: (state) -> state.reached_the_end = false
	actions:
		change_category: ({ commit, dispatch }, category) ->
			commit 'set_attributes', null
			commit 'set_category', category
			commit 'set_filters', []
			commit 'set_sorters', []
			commit 'set_shower_names', []
			Promise.all
				-	dispatch 'search'
				-	dispatch 'get_attributes'
		toggle_sort_direction: ({ commit, dispatch, state, getters }, { attribute_name, direction }) ->
			sorter = getters.sorters_by_attribute_name[attribute_name]
			if sorter
				commit 'remove_sorter_at', sorter.index
				if sorter.direction == direction
					return dispatch 'search'
			commit 'add_sorter', { attribute_name, direction }
			dispatch 'search'
		### aka get_products ### # todo rename
		search: ({ commit, state }, { append = false } = {}) ->
			if append and state.reached_the_end
				# To prevent unnecessary requests when the last appending request
				# already returned an empty set
				return
			commit 'end_not_yet_reached' #  todo rename has_more and set_has_more true
			if not append
				commit 'set_products', []
				commit 'set_offset', 0
			{ category, columns, limit, offset } = state
			showers_param = state.shower_names
				.join ','
			if not showers_param
				showers_param = columns
			sorters_param = state.sorters
				.map (sorter) => "#{sorter.attribute_name}:#{sorter.direction}"
				.join ','
			filters_param = state.filters
				.map (filter) => "#{filter.attribute_name}:#{filter.condition}:#{filter.value}:#{if not filter.case_sensitive then 'i' else ''}"
				.join ','
			response = await axios.get 'product',
				params:
					category: category,
					show: showers_param,
					filter: filters_param,
					sort: sorters_param,
					limit: limit
					offset: offset
			commit 'set_shower_names', response.data.shower_names
			commit 'add_products', response.data.products
			if not response.data.products.length
				commit 'end_reached'
		move_shower_to: ({ dispatch, commit, state }, { index, shower_name }) ->
			current_pos = state.shower_names.findIndex (e) => e == shower_name
			new_pos = index
			if current_pos > -1
				commit 'remove_shower_name_at', current_pos # user moved shower from pos A to B
				if index > current_pos
					new_pos -= 1
			commit 'add_shower_name_at', { index: new_pos, shower_name }
			if new_pos != current_pos
				dispatch 'search'
		remove_shower: ({ commit, getters, dispatch }, shower_name ) ->
			search = false
			attribute_filters = getters.filters_by_attribute_name[shower_name]
			if attribute_filters.length
				if not await dispatch 'confirm_ask', "There are #{attribute_filters.length} filter(s) configured for '#{getters.attributes_by_name[shower_name].name}' that will be removed. Continue?", root: true
					return
				for filter from attribute_filters
					commit 'remove_filter', filter
				search = true
			attribute_sorter = getters.sorters_by_attribute_name[shower_name]
			if attribute_sorter.direction
				commit 'remove_sorter_at', attribute_sorter.index
				search = true
			commit 'remove_shower_name', shower_name
			if search
				dispatch 'search'
		add_product: ({ commit, state }, { form_data }) ->
			form_data.append 'category', state.category
			response = await axios.post 'product', form_data
			commit 'add_product', response.data
		save_datum: ({ commit, state }, { product, attribute_name, form_data }) ->
			response = await axios.post "product/#{product.name}/data/#{attribute_name}", form_data
			commit 'add_product_datum', { product, attribute_name, datum: response.data }
		get_attributes: ({ commit, state }) ->
			response = await axios.get 'attribute', { params: { category: state.category } }
			attributes = response.data
			attributes.unshift
				category: 'Thing'
				verified: true
				name: 'thumbnail'
				label: 'Thumbnail'
				type: 'resource'
			,
				category: 'Thing'
				verified: true
				name: 'label'
				label: 'Name'
				type: 'string'
			commit 'set_attributes', attributes
		add_filter: ({ commit, dispatch, getters }, { values }) -> # todo formdata?
			commit 'add_filter', values
			dispatch 'search'
		remove_filter: ({ commit, dispatch }, filter) ->
			commit 'remove_filter', filter
			dispatch 'search'
		set_limit: ({ commit, dispatch }, limit) ->
			commit 'set_limit', limit
			dispatch 'search'
		fetch_next_page: ({ commit, dispatch, state }) ->
			commit 'set_offset', state.offset + state.limit
			dispatch 'search', { append: true }
		# add_column: ({ commit, state }) ->
		# 	commit 'set_column', state.column + 1