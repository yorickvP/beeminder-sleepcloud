const util = require('util')
const execAsync = util.promisify(require('child_process').exec)

const {OAuth2Client} = require('google-auth-library')
const http = require('http')
const url = require('url')
const readline = require('readline')
const fs = require('fs').promise

const {installed: oauth_id} = require('../oauth_id.json')
const cache_location = __dirname + '/../oauth-cache.json'

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
        server.listen(port, async () => {
            try {
                await execAsync(`xdg-open ${auth_url}`)
                console.log("Look at the page in your browser")
            } catch (e) {
                reject(e)
            }
        })
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

async function getAccessToken(oauth2Client) {
    function generate_auth_url(port) {
        if (port) oauth2Client.redirectUri_ = "http://localhost:" + port
        else      oauth2Client.redirectUri_ = 'urn:ietf:wg:oauth:2.0:oob'
        return oauth2Client.generateAuthUrl({
            access_type: 'offline', // will return a refresh token
            scope: 'https://www.googleapis.com/auth/userinfo.email'
        })
    }
    let code
    try {
        code = await askTokenAuto(generate_auth_url)
    } catch(e) {
        console.log('Automatic browser opening failed, trying manual auth')
        code = await askTokenManual(generate_auth_url)
    }
    const tokens = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)
    return oauth2Client
}

async function writeCache(oauth2Client) {
    await fs.writeFile(cache_location, JSON.stringify(oauth2Client.credentials))
    return oauth2Client
}

async function loadCache(oauth2Client) {
    const tokens = JSON.parse(await fs.readFile(cache_location))
    oauth2Client.setCredentials(tokens)
    if (tokens.expiry_date < Date.now()) {
        console.log('refreshing access token')
        await oauth2Client.refreshAccessToken()
        await writeCache(oauth2Client)
    }
    return oauth2Client
}

async function make_userinfo_oauth() {
    var oauth2Client = Promise.promisifyAll(new OAuth2Client(oauth_id.client_id, oauth_id.client_secret))
    try {
        return await loadCache(oauth2Client)
    } catch (e) {
        await getAccessToken(oauth2Client)
        await writeCache(oauth2Client)
    }
}
module.exports = make_userinfo_oauth
