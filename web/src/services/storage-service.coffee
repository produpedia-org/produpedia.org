export default
	get: (item) ->
		JSON.parse localStorage.getItem(item)
	set: (item, value) ->
		if !value
			localStorage.removeItem item
		else
			cookies_accepted = @get 'cookies_accepted'
			if not cookies_accepted
				if not confirm """
					COOKIE WARNING
					
					This action will store cookies and/or local storage data in your browser. Do you agree?
					
					If you accept, you will not be asked again once further cookie usage occurs.
					If you deny, some things may not work as expected.

					You can find details about our cookie usage at https://produpedia.org/static/privacy.html
				"""
					throw new Error 'Cookie consent denied'
				localStorage.setItem 'cookies_accepted', 1
			localStorage.setItem item, JSON.stringify(value)
