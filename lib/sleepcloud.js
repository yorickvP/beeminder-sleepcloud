var querystring = require('querystring')

var make_userinfo_oauth = require('./googleauth.js')
var request = require('request')

function sleepcloud_oauth_fetch(authClient, opts, callback) {
	/* timestamp - standard timestamp (in milliseconds) of the oldest record we are interested in.
					The intention is 3rd party services will remember the last timestamp used (per-user)
					and will always ask only for new records. Alternatively a timestamp of latest known
					record can be used. This argument can be left empty to fetch all records. 
	 * actigraph - set true to retrieve actigraphs - recording of user activity during the night
	 * labels    - set true to retrieve hypnogram data and other labelled events, such as sleep phases, alarms, snoring etc.
	 * sample    - set true to get static testing data for easier integration 
	 */
	var uri = "https://sleep-cloud.appspot.com/fetchRecords?" + querystring.stringify(opts)
	console.log('HTTPS GET' + ' ' + uri)
	authClient.request({ uri: uri }, callback)
}
function sleepcloud_token_fetch(token, opts, callback) {
	opts.user_token = token
	sleepcloud_oauth_fetch({
		request: function(req_params, cb) {
			request(req_params, function(err, res, body) {
				cb(err, JSON.parse(body))
			})
		}
	}, opts, callback)
}
module.exports.oauth = sleepcloud_oauth_fetch
module.exports.token = sleepcloud_token_fetch
