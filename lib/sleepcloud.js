var querystring = require('querystring')

var make_userinfo_oauth = require('./googleauth.js')

function sleepcloud_fetch(authClient, opts, callback) {
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
module.exports = sleepcloud_fetch
