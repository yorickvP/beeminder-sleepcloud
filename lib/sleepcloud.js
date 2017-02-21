const request = require('request-promise')

function sleepcloud_token_fetch(token, opts) {
	// see http://sleep.urbandroid.org/documentation/developer-api/sleepcloud-storage-api/
	opts.user_token = token
	return request({
		uri: 'https://sleep-cloud.appspot.com/fetchRecords',
		qs: opts,
		json: true,
	})
}

module.exports.token = sleepcloud_token_fetch
