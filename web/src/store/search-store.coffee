import storage_service from '@/services/storage-service'
import Vue from 'vue'
import { router } from '../vue-app'

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
		category: null
		filters: [
		]
		shower_names: []
		### The API returns a shower_names array, even if you only queried for
		a column count (show=number), so need to keep track of whether the user modified
		the showers manually (or whether some were given via query params). Without this
		property, shower names would always pop up after an update_query, even if they were
		unmodified, cramming the url unnecessarily ####
		shower_names_modified: false
		sorters: [
		]
		columns: 25
		limit: 20
		offset: 0
		### server response; readonly ###
		attributes: null
		products: null
		### other ###
		fetching_data: false
		reached_the_end: false
		category_breadcrumbs_ref: []
		search_failure: null
	getters:
		attribute_names: (state) ->
			(state.attributes or []).map (a) => a.name
		attributes_by_name: (state) ->
			(state.attributes or []).reduce((all, attribute) =>
				all[attribute.name] = attribute
				all
			, {})
		product_by_name: (state) ->
			(state.products or []).reduce((all, product) =>
				all[product.name] = product
				all
			, {})
		# todo rename to sorter_by_attribute_name
		sorters_by_attribute_name: (state) ->
			state.sorters.reduce (all, sorter, sorter_index) =>
				all[sorter.attribute_name] =
					index: sorter_index
					direction: sorter.direction
				all
			, {}
		filters_by_attribute_name: (state) ->
			state.filters.reduce (all, filter) =>
				if not all[filter.attribute_name]
					all[filter.attribute_name] = []
				all[filter.attribute_name].push filter
				all
			, {}
		invisible_filters: (state) ->
			state.filters.filter (filter) =>
				not state.shower_names.includes filter.attribute_name
		invisible_sorters: (state) ->
			state.sorters.filter (sorter) =>
				not state.shower_names.includes sorter.attribute_name
		sorters_amount: (state) -> state.sorters.length
		# todo docs belong here not top
		hidden_attribute_names: (state, getters) ->
			getters.attribute_names
				.filter (attribute_name) =>
					!state.showers.includes attribute_name
		category_ref: (state, getters, rootState, rootGetters) ->
			rootGetters['category/category_by_name'][state.category]
		has_more_attributes: (state) ->
			state.attributes.length - state.shower_names.length
		# To prevent unnecessary requests when the last appending request
		# already returned an empty set
		can_fetch_next_page: (state) ->
			not state.reached_the_end and !!state.products.length
		query: (state) ->
			{ columns, limit, offset } = state
			if state.shower_names_modified
				showers_param = state.shower_names
					.join ','
			else
				showers_param = columns + ""
			sorters_param = state.sorters
				.map (sorter) => "#{sorter.attribute_name}:#{sorter.direction}"
				.join ','
			filters_param = state.filters
				.map (filter) =>
					param = "#{filter.attribute_name}:#{filter.condition}"
					if filter.value
						param += ":#{filter.value}"
					if filter.case_insensitive
						param += ":i"
					param
				.join ','
			attributes: showers_param
			filter: filters_param or undefined
			sort: sorters_param  or undefined
			limit: limit + ""
	mutations:
		set_category: (state, category) -> state.category = category
		remove_sorter_at: (state, index) -> Vue.delete state.sorters, index
		add_sorter: (state, sorter) -> state.sorters.push sorter
		set_sorters: (state, sorters) -> state.sorters = sorters
		set_products: (state, products) -> state.products = products
		add_product: (state, product) ->
			if not state.products
				state.products = []
			state.products.push product
		add_products: (state, products) -> state.products.push ...products
		add_product_datum: (state, { product, attribute_name, datum }) ->
			Vue.set product.data, attribute_name, datum
		set_shower_names: (state, shower_names) -> state.shower_names = shower_names
		remove_shower_name_at: (state, index) -> Vue.delete state.shower_names, index
		remove_shower_name: (state, shower_name) -> Vue.delete state.shower_names, state.shower_names.indexOf(shower_name) # todo add prototy .remove method
		add_shower_name_at: (state, { index, shower_name }) -> state.shower_names.splice index, 0, shower_name # todo ^
		set_attributes: (state, attributes) -> state.attributes = attributes
		add_attribute: (state, attribute) -> state.attributes.push attribute
		add_attributes: (state, attributes) ->
			if not state.attributes
				state.attributes = []
			state.attributes.push ...attributes
		add_filter: (state, filter) -> state.filters.push filter
		remove_filter: (state, filter) -> Vue.delete state.filters, state.filters.indexOf(filter)
		replace_filter: (state, { filter, model }) ->
			Vue.set filter, 'value', model.value
			Vue.set filter, 'condition', model.condition
			Vue.set filter, 'case_insensitive', model.case_insensitive
			# This alternative way also leads to the destroy hook problem described in
			# filterr/meta. must not lose object reference.
			# state.filters.splice state.filters.indexOf(filter), 1, JSON.parse(JSON.stringify(model))
		set_filters: (state, filters) -> state.filters = filters
		set_columns: (state, columns) -> state.columns = columns
		set_limit: (state, limit) -> state.limit = limit
		set_offset: (state, offset) -> state.offset = offset
		end_reached: (state) -> state.reached_the_end = true
		end_not_yet_reached: (state) -> state.reached_the_end = false
		set_fetching_data: (state, fetching_data) -> state.fetching_data = fetching_data
		set_category_breadcrumbs_ref: (state, breadcrumbs) -> state.category_breadcrumbs_ref = breadcrumbs
		set_shower_names_modified: (state, flag) -> state.shower_names_modified = flag
		set_search_failure: (state, failure) -> state.search_failure = failure
	actions:
		change_category: ({ commit, dispatch, rootState }, category) ->
			commit 'set_attributes', null
			commit 'set_category', category
			if not category
				commit 'set_category_breadcrumbs_ref', []
			else
				# Fire all requests simultaneously, but handle breadcrumbs errors
				# before others. Reason: Possible Category404
				responses = await Promise.allSettled
					-	dispatch 'get_category_breadcrumbs'
					-	Promise.all
							-	dispatch 'get_append_attributes', { category }
				if responses[0].reason
					throw responses[0].reason
				if responses[1].reason
					throw responses[1].reason
		toggle_sort: ({ commit, dispatch, getters }, attribute_name) ->
			sorter = getters.sorters_by_attribute_name[attribute_name]
			if sorter
				commit 'remove_sorter_at', sorter.index
				if sorter.direction == 1
					commit 'add_sorter', { attribute_name, direction: -1 }
			else
				commit 'add_sorter', { attribute_name, direction: 1 }
			dispatch 'update_query'
		### aka get_products ### # todo rename
		search: ({ commit, state }, { append = false, query } = {}) ->
			if append
				commit 'set_offset', state.offset + state.limit
			else
				commit 'set_offset', 0
			commit 'set_fetching_data', true
			commit 'end_not_yet_reached' #  todo rename has_more and set_has_more true
			response = await @$http.get "list/#{state.category}", params: {
				...(query or router.currentRoute.query)
				# Offset is used in API calls but when included in query, effectively ignored:
				# The current offset in view is not synced with the URL. Maybe some day
				offset: state.offset or undefined
			}
			if append
				commit 'add_products', response.data.products
			else
				commit 'set_products', response.data.products
			commit 'set_shower_names', response.data.shower_names
			commit 'set_search_failure', response.data.failure
			if not response.data.products.length
				commit 'end_reached'
			commit 'set_fetching_data', false
		get_product: ({ commit }, product_name) ->
			response = await @$http.get "product/#{product_name}"
			product = response.data
			commit 'add_product', product
		move_shower_to: ({ dispatch, commit, state }, { index, shower_name }) ->
			current_pos = state.shower_names.findIndex (e) => e == shower_name
			new_pos = index
			if current_pos > -1
				commit 'remove_shower_name_at', current_pos # user moved shower from pos A to B
				if index > current_pos
					new_pos -= 1
			commit 'add_shower_name_at', { index: new_pos, shower_name }
			if new_pos != current_pos
				commit 'set_shower_names_modified', true
				dispatch 'update_query'
		remove_shower: ({ state, commit, getters, dispatch }, shower_name ) ->
			search = false
			attribute_filters = getters.filters_by_attribute_name[shower_name]
			if attribute_filters?.length
				# todo this never fires (?)
				if not await dispatch 'confirm_ask', "There are #{attribute_filters.length} filter(s) configured for '#{getters.attributes_by_name[shower_name].name}' that will be removed. Continue?", root: true
					return
				for filter from attribute_filters
					commit 'remove_filter', filter
				search = true
			attribute_sorter = getters.sorters_by_attribute_name[shower_name]
			if attribute_sorter?.direction
				commit 'remove_sorter_at', attribute_sorter.index
				search = true
			commit 'remove_shower_name', shower_name
			# Modified after removing a shower, but when there are none, fall back to default
			commit 'set_shower_names_modified', !! state.shower_names.length
			# if not search
			# 	prevent search from happening with the next update_query somehow,
			# 	because the data is already there, just needs restructure. TODO (minor)
			dispatch 'update_query'
		add_product: ({ commit, state }, { form_data }) ->
			form_data.append 'category', state.category
			response = await @$http.post 'product', form_data
			commit 'add_product', response.data
		save_datum: ({ commit, state }, { product, attribute_name, form_data }) ->
			response = await @$http.post "product/#{product.name}/data/#{attribute_name}", form_data
			commit 'add_product_datum', { product, attribute_name, datum: response.data }
			response = await @$http.get 'attribute', { params: { category: state.category } }
		# todo refactor: change to options:add:true (rename to append), just like base crud store, but
		# this store module should extend basecrudstore anyway, partially?multiple entities?
		get_append_attributes: ({ commit, state }, params = {}) ->
			response = await @$http.get 'attribute', { params }
			attributes = response.data
			# attributes.unshift
			# 	category: 'thing'
			# 	verified: true
			# 	name: 'thumbnail'
			# 	label: 'Thumbnail'
			# 	type: 'resource'
			# ,
			# 	category: 'thing'
			# 	verified: true
			# 	name: 'label'
			# 	label: 'Name'
			# 	type: 'string'
			commit 'add_attributes', attributes
		get_attribute: ({ commit }, attribute_name) ->
			response = await @$http.get "attribute/#{attribute_name}"
			attribute = response.data
			commit 'add_attribute', attribute
		add_filter: ({ commit, dispatch, getters }, values) ->
			commit 'add_filter', values
			dispatch 'update_query'
		remove_filter: ({ commit, dispatch, state }, filter) ->
			commit 'remove_filter', filter
			dispatch 'update_query'
		### The params for this action are somewhat weird because filters dont have
		any unique key (they shouldnt; there can be duplicate filters).
		Because of that, need to work with obj refs and array indices ###
		replace_filter: ({ state, commit, dispatch }, { filter, model }) ->
			commit 'replace_filter', { filter, model }
			dispatch 'update_query'
		set_limit: ({ commit, dispatch }, limit) ->
			commit 'set_limit', limit
			dispatch 'update_query'
		fetch_next_page: ({ commit, dispatch, state }) ->
			dispatch 'search', { append: true }
		# add_column: ({ commit, state }) ->
		# 	commit 'set_column', state.column + 1
		get_category_breadcrumbs: ({ state, getters, dispatch, commit }) ->
			category_i = getters.category_ref
			if category_i
				# At least some categories are loaded
				path = [category_i]
				while category_i.parents.length
					if category_i.parents.length != category_i.parents_ref.length
						# Only partially loaded; not enough info for full breadcrumbs
						# TODO: test if this happens at all
						path = null
						break
					path.unshift category_i.parents_ref[0]
					category_i = category_i.parents_ref[0]
			if not path
				path = await dispatch 'category/get_categories_raw', {
					options: add: true
					params: breadcrumbs: state.category
				}, root: true
			commit 'set_category_breadcrumbs_ref', path
		### Search params serialization. Parser see ResultView:fetch ###
		# todo rename
		update_query: ({ getters }) ->
			try
				await router.push query: getters.query
			catch e
				if e.name != 'NavigationDuplicated' and (not e.message.includes("Navigation cancelled from ") and not e.message.includes(" with a new navigation."))
					throw e