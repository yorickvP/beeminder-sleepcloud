const request = require('request-promise')

const SLEEP_URL = 'https://sleep-cloud.appspot.com/fetchRecords'

function sleepcloud_oauth(auth, opts) {
	// see http://sleep.urbandroid.org/documentation/developer-api/sleepcloud-storage-api/
	console.log("HTTPS GET", SLEEP_URL)
	return auth.getRequestMetadataAsync(SLEEP_URL).then(headers => {
		return request({
			uri: SLEEP_URL,
			qs: opts,
			json: true,
			headers
		})
	})
}

module.exports.oauth = sleepcloud_oauth
