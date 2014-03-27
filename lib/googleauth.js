
var readline = require('readline')

var exec = require('child_process').exec
var http = require('http')
var url = require('url')

var fs = require('fs')
var OAuth2Client = require('googleapis').OAuth2Client


var CLIENT_ID = '396342098198.apps.googleusercontent.com'
var CLIENT_SECRET = 'a92CnzRGxDBg7ACzoaqesMoA'
var cache_location = __dirname + '/../oauth-cache.json'

var close_page = fs.readFileSync(__dirname + '/../static/close_page.html')

function askTokenAuto(auth_url, callback) {
	var server = http.createServer(function(req, res) {
		var u = url.parse(req.url, true)
		res.writeHead(200, {
			'Content-Length': close_page.length,
			'Content-Type': 'text/html'
		})
		res.end(close_page)
		req.destroy()
		server.close()
		callback(u.query.code)
	})
	// try xdg+http server, if it doesn't work, use manual input
	var port = 49152 + ((Math.random() * 16382) | 0)
	server.listen(port, function() {
		exec('xdg-open "' + auth_url(port) + '"', function(error) {
			if (error) {
				server.close()
				console.log('Automatic browser opening failed, trying manual auth')
				askTokenManual(auth_url, callback)
			} else {
				console.log('Look at the page in your browser')
			}
		})
	})
}

function askTokenManual(auth_url, callback) {
	console.log('Please visit the url: ', auth_url())
	var rl = readline.createInterface({
		input: process.stdin, output: process.stdout
	})
	rl.question('Enter the code here:', function(code) {
		rl.close()
		callback(code)
	})
}

function getAccessToken(oauth2Client, callback) {
	function generate_auth_url(port) {
		if (port) oauth2Client.redirectUri_ = "http://localhost:" + port
		else      oauth2Client.redirectUri_ = 'urn:ietf:wg:oauth:2.0:oob'
		return oauth2Client.generateAuthUrl({
			access_type: 'offline', // will return a refresh token
			scope: 'https://www.googleapis.com/auth/userinfo.email'
		})
	}
	askTokenAuto(generate_auth_url, function(code) {
		// request access token
		oauth2Client.getToken(code, function(err, tokens) {
			oauth2Client.setCredentials(tokens)
			callback()
		})
	})
}
// this approximately does Object.prototype.watch from firefox
function watch(obj, prop, callback) {
	var value = obj[prop]
	delete obj[prop]
	Object.defineProperty(obj, prop, {
		get: function() { return value },
		set: function(val) {
			value = val
			callback(val)
			return val
		},
		enumerable: true,
		configurable: true
	})
}
function make_userinfo_oauth(callback) {
	var oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET)
	// load credentials from disk
	if (fs.existsSync(cache_location)) {
		oauth2Client.setCredentials(JSON.parse(fs.readFileSync(cache_location)))
	}

	// write the credentials out to disk when they change
	watch(oauth2Client, 'credentials', function(credentials) {
		fs.writeFileSync(cache_location, JSON.stringify(credentials))
	})
	if(oauth2Client.credentials === null) {
		// retrieve an access token
		getAccessToken(oauth2Client, function() {
			callback(oauth2Client)
		})
	} else {
		callback(oauth2Client)
	}
}
module.exports = make_userinfo_oauth



