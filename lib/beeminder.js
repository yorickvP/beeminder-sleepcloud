const fetch = require('node-fetch')
const API_URL = "https://www.beeminder.com/api/v1/"
class Beeminder {
    constructor(auth_token) {
        this.auth_token = auth_token
    }
    async fetch(req_params, thing, opts) {
	      opts = Object.assign({auth_token: this.auth_token}, opts)
        const uri = API_URL + thing + '.json?' + new URLSearchParams(opts)
	      console.log('HTTPS ' + req_params.method + ' ' + uri)
        await fetch(uri)
            .then(res => res.json())
            .then(res => {
                if (res.error) throw res.error
                return res
            })
    }
    async get(thing, opts) {
        return await this.fetch({}, thing, opts)
    }
    async post(thing, opts) {
        return await this.fetch({method: 'POST'}, thing, opts)
    }
}

module.exports = Beeminder
