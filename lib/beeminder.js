var https = require('https')
var querystring = require('querystring')
var request = require('request')
var API_URL = " https://www.beeminder.com/api/v1/"
function Beeminder(auth_token) {
	this.auth_token = auth_token
}
Beeminder.prototype.get = function(thing, opts, cb) {
	var opts = opts || {}
	opts.auth_token = this.auth_token
	request(API_URL + thing + '.json?' + querystring.stringify(opts),
	function(err, res, body) {
		cb(err, JSON.parse(body))
	})
}

module.exports = Beeminder
