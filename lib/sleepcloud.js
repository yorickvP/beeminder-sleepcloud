const fetch = require('node-fetch')

const SLEEP_URL = 'https://sleep-cloud.appspot.com/fetchRecords'

async function sleepcloud_oauth(auth, opts) {
	  // see http://sleep.urbandroid.org/documentation/developer-api/sleepcloud-storage-api/
	  console.log("HTTPS GET", SLEEP_URL)
	  const headers = await auth.getRequestMetadataAsync(SLEEP_URL)
    return fetch(SLEEP_URL + '?' + new URLSearchParams(opts), {
        headers
    }).then(JSON.parse)
}

module.exports.oauth = sleepcloud_oauth

function sleepcloud_token_fetch(token, opts) {
	  // see http://sleep.urbandroid.org/documentation/developer-api/sleepcloud-storage-api/
	  opts.user_token = token
    return fetch(SLEEP_URL + '?' + new URLSearchParams(opts), {
        headers
    }).then(JSON.parse)
}

module.exports.token = sleepcloud_token_fetch
