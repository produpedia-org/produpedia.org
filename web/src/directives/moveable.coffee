import Vue from 'vue'

### this makes the element become position absolute permanently ###
Vue.directive 'moveable',
	bind: (el) =>
		el.onmousedown = (event) =>
			mouse_offset_x = event.clientX - el.getBoundingClientRect().left
			mouse_offset_y = event.clientY - el.getBoundingClientRect().top

			el.style.position = 'absolute'
			
			move_to = (mouse_event) =>
				el.style.left = mouse_event.pageX - mouse_offset_x + 'px'
				el.style.top = mouse_event.pageY - mouse_offset_y + 'px'

			move_to event

			document.addEventListener 'mousemove', move_to
			el.onmouseup = =>
				document.removeEventListener 'mousemove', move_to
				el.onmouseup = null
			
			el.ondragstart = => false