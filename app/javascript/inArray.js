if(typeof(inArray) === 'undefined') {
	window.inArray = function (needle, haystack, ignoreCase, checkNeedleContainsHaystack, checkHaystackContainsNeedle) {
		if(ignoreCase) {
			needle = needle.toLowerCase();
		}
		
		for(var i = 0; i < haystack.length; i ++) {
			if(ignoreCase) {
				if(checkNeedleContainsHaystack) {
					if(needle.indexOf(haystack[i].toLowerCase()) !== -1) {
						return true;
					}
						
				}
				if(checkHaystackContainsNeedle) {
					if(haystack[i].toLowerCase().indexOf(needle) !== -1) {
						return true;
					}
				}
				if(needle === haystack[i].toLowerCase()) {
					return true;
				}
			}
			else {
				if(checkNeedleContainsHaystack) {
					if(needle.indexOf(haystack[i]) !== -1) {
						return true;
					}
						
				}
				if(checkHaystackContainsNeedle) {
					if(haystack[i].indexOf(needle) !== -1) {
						return true;
					}
				}
				if(needle === haystack[i]) {
					return true;
				}
			}
		}
		return false;
	}
}