#!/usr/bin/env node

var make_userinfo_oauth = require('./lib/googleauth.js')
var sleepcloud_fetch = require('./lib/sleepcloud.js')
var Beeminder = require('./lib/beeminder.js')
var config = require('./config.json')
function get_sleeps(time, cb) {
	if (config.sleepcloud && config.sleepcloud.user_token && config.sleepcloud.user_token.length > 30) {
		sleepcloud_fetch.token(config.sleepcloud.user_token, {timestamp: +time}, cb)
	} else {
		make_userinfo_oauth(function(oauth2Client) {
			sleepcloud_fetch.oauth(oauth2Client, {timestamp: +time}, cb)
		})
	}
}

function pad2(x) {
	return x < 10 ? '0' + x : x
}
function makehumantime(date) {
	var d = new Date(date)
	return d.getHours()+':'+pad2(d.getMinutes())
}
function comment(d) {
	return "sleepcloud " +  makehumantime(d.fromTime) + " - " +
							makehumantime(d.toTime) + "("+(d.lengthMinutes / 60).toFixed(2)+")"
}
function parsehumantime(time) {
	var time_split = time.split(':')
	return [+time_split[0], +time_split[1]]
}
function clone_date(d) {
	return new Date(+d)
}
function time_gte(ah, am, bh, bm) {
	return ah >= bh && (ah > bh || am >= bm)
}
// find the earliest sleep for every day, starting at 16:00 or so
// and calculate the target_day as the day after it
function find_earliest_sleeps(sleeps, day_start) {
	var day_sets = {}
	// calculate the day to submit the sleeps on
	// and sort them by that day into an object
	sleeps.forEach(function(sl) {
		var from_time = new Date(sl.fromTime)
		var target_day = clone_date(from_time)
		if (time_gte(from_time.getHours(), from_time.getMinutes(), day_start[0], day_start[1])) {
			target_day.setDate(target_day.getDate()+1)
		}
		target_day.setHours(0, 0, 0, 0)
		if (!day_sets[+target_day]) day_sets[+target_day] = []
		day_sets[+target_day].push(sl)
	})
	// find the first sleep for every day and make it into an array
	return Object.keys(day_sets).map(function(target_day) {
		return {
			target_day: new Date(+target_day),
			// this can be more efficient, but that's not needed
			sleep: day_sets[target_day].sort(function(a, b) {
				return a.fromTime - b.fromTime
			})[0]
		}
	})
}
function stayed_up(target_day, bedtime, daystart, fromTime) {
	var this_bedtime = clone_date(target_day)
	this_bedtime.setHours(bedtime[0], bedtime[1])
	if (time_gte(bedtime[0], bedtime[1], daystart[0], daystart[1])) {
		// the bedtime is before 00:00
		// so it's currently a day late
		this_bedtime.setDate(this_bedtime.getDate()-1)
	}
	return ((fromTime - this_bedtime) / 1e3 / 60 / 60).toFixed(2)
}
if (!config.beeminder.auth || !config.beeminder.auth.length) {
	console.error("ERROR: couldn't find beeminder auth token")
	console.error("did you forget to edit config.json?")
	console.error("you can find your auth token at https://www.beeminder.com/api/v1/auth_token.json")
	process.exit()
}
var b = new Beeminder(config.beeminder.auth)
b.get('users/me/goals/'+config.beeminder.goal, {datapoints:true}, function(err, res) {
	if (err) {
		console.log("Something went wrong", err)
	} else {
		var daystart = parsehumantime(config.daystart)
		var bedtime = parsehumantime(config.bedtime)
		var last_point = new Date(res.datapoints[res.datapoints.length-1].timestamp*1e3)
		last_point.setHours(daystart[0], daystart[1])
		console.log('getting data from', last_point)
		get_sleeps(last_point, function(err, response) {
			if (err) {
				return console.log("Something went wrong", err)
			}
			// find the earliest sleep for one day, starting at 16:00 or so
			var day_sleep = find_earliest_sleeps(response.sleeps, daystart)
			var sorted_sleep = day_sleep.sort(function(a, b) {
				return a.target_day - b.target_day
			})
			var submit_data = sorted_sleep.map(function(day_sleep_data) {
				var target_day = day_sleep_data.target_day
				var d = day_sleep_data.sleep

				var stayed_up_length = stayed_up(target_day, bedtime, daystart, d.fromTime)

				// the timestamps on beeminder are on 17:00
				var timestamp = clone_date(target_day).setHours(17, 0, 0) / 1e3
				console.log(clone_date(target_day).getDate() +
					" "+ stayed_up_length+' "' + comment(d) + '"')

				return {
					timestamp: timestamp,
					value: stayed_up_length,
					comment: comment(d)
				}
			})
			if (submit_data.length) {
				b.post('users/me/goals/'+config.beeminder.goal+'/datapoints/create_all',
					{datapoints: JSON.stringify(submit_data)},
					function(err, res) {
					if (!err && !res.error) {
						console.log("data submitted")
					} else {
						console.log("Something went wrong submitting the data", err, res)
					}
				})
			} else {
				console.log('Nothing to submit')
			}
		})
	}
})
