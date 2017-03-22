const Promise = require('bluebird')
const google = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const execAsync = Promise.promisify(require('child_process').exec)
const http = require('http')
const url = require('url')
const readline = require('readline')
const fs = Promise.promisifyAll(require('fs'))

const {installed: oauth_id} = require('../oauth_id.json')
const cache_location = __dirname + '/../oauth-cache.json'
Promise.promisifyAll(http)

const close_page = `You can close this page now.`

function askTokenAuto(auth_url) {
    let server
    return new Promise((resolve, reject) => {
        server = http.createServer(function(req, res) {
            const {query: {code}} = url.parse(req.url, true)
            res.writeHead(200, {
                'Content-Length': close_page.length,
                'Content-Type': 'text/html'
            })
            res.end(close_page)
            req.destroy()
            resolve(code)
        })
        // try xdg+http server, if it doesn't work, use manual input
        const port = 49152 + ((Math.random() * 16382) | 0)
        server.listenAsync(port)
            .then(() => execAsync(`xdg-open "${auth_url(port)}"`))
            .then(() => console.log("Look at the page in your browser"))
            .catch(reject)
    }).finally(() => {
        server.close()
    })
}

function questionAsync(query) {
    const rl = readline.createInterface({
        input: process.stdin, output: process.stdout
    })
    return new Promise((resolve) => {
        rl.question(query, (code) => {
            rl.close()
            resolve(code)
        })
    })
}

function askTokenManual(auth_url) {
    console.log('Please visit the url: ', auth_url())
    return questionAsync("Enter the code here: ")
}

function getAccessToken(oauth2Client) {
    function generate_auth_url(port) {
        if (port) oauth2Client.redirectUri_ = "http://localhost:" + port
        else      oauth2Client.redirectUri_ = 'urn:ietf:wg:oauth:2.0:oob'
        return oauth2Client.generateAuthUrl({
            access_type: 'offline', // will return a refresh token
            scope: 'https://www.googleapis.com/auth/userinfo.email'
        })
    }
    return askTokenAuto(generate_auth_url)
        .catch(() => {
            console.log('Automatic browser opening failed, trying manual auth')
            return askTokenManual(generate_auth_url)
        })
        .then(code => oauth2Client.getTokenAsync(code))
        .then(tokens => {
            oauth2Client.setCredentials(tokens)
            return oauth2Client
        })
}

function writeCache(oauth2Client) {
    return fs.writeFileAsync(cache_location, JSON.stringify(oauth2Client.credentials))
        .then(() => oauth2Client)
}

function loadCache(oauth2Client) {
    return fs.readFileAsync(cache_location).then(JSON.parse).then(tokens => {
        oauth2Client.setCredentials(tokens)
        if (tokens.expiry_date < Date.now()) {
            console.log('refreshing access token')
            return oauth2Client.refreshAccessTokenAsync().then(() => writeCache(oauth2Client))
        }
    }).then(() => oauth2Client)
}


function make_userinfo_oauth() {
    var oauth2Client = Promise.promisifyAll(new OAuth2(oauth_id.client_id, oauth_id.client_secret))
    return loadCache(oauth2Client)
        .catch(() => getAccessToken(oauth2Client).then(writeCache))
}
module.exports = make_userinfo_oauth
