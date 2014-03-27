var https = require('https')
var querystring = require('querystring')
var request = require('request')
var API_URL = "https://www.beeminder.com/api/v1/"
function Beeminder(auth_token) {
	this.auth_token = auth_token
}
Beeminder.prototype.request = function(req_params, thing, opts, cb) {
	var opts = opts || {}
	opts.auth_token = this.auth_token
	var req_params = req_params || {}
	req_params.uri = API_URL + thing + '.json?' + querystring.stringify(opts)
	console.log('HTTPS ' + (req_params.method || 'GET') + ' ' + req_params.uri)
	request(req_params, function(err, res, body) {
		cb(err, JSON.parse(body))
	})
}
Beeminder.prototype.get = function(thing, opts, cb) {
	this.request({}, thing, opts, cb)
}
Beeminder.prototype.post = function(thing, opts, cb) {
	this.request({method: 'POST'}, thing, opts, cb)
}

module.exports = Beeminder
