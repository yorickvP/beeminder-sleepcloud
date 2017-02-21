const request = require('request-promise')
const API_URL = "https://www.beeminder.com/api/v1/"
function Beeminder(auth_token) {
	this.auth_token = auth_token
}
Beeminder.prototype.request = function(req_params, thing, opts) {
	opts = Object.assign({auth_token: this.auth_token}, opts)
	req_params.uri = API_URL + thing + '.json?'
	req_params = Object.assign({
		method: 'GET',
		uri: API_URL + thing + '.json',
		qs: opts,
		json: true
	}, req_params)
	console.log('HTTPS ' + req_params.method + ' ' + req_params.uri)
	return request(req_params).then(res => {
		if (res.error) throw res.error
		return res
	})
}
Beeminder.prototype.get = function(thing, opts, cb) {
	return this.request({}, thing, opts)
}
Beeminder.prototype.post = function(thing, opts, cb) {
	return this.request({method: 'POST'}, thing, opts)
}

module.exports = Beeminder
