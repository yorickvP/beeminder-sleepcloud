#!/usr/bin/env node

const sleepcloud_fetch = require('./lib/sleepcloud.js')
const Beeminder = require('./lib/beeminder.js')

function read_config(file = './config.json') {
	const config = require(file)
	if (!(config.sleepcloud && config.sleepcloud.user_token && config.sleepcloud.user_token.length > 30)) {
		throw new Error("you have to specify a user token, see readme")
	}
	if (!config.beeminder.auth || !config.beeminder.auth.length) {
		console.error("ERROR: couldn't find beeminder auth token")
		console.error("did you forget to edit config.json?")
		console.error("you can find your auth token at https://www.beeminder.com/api/v1/auth_token.json")
		throw new Error("config error")
	}
	config.daystart = parsehumantime(config.daystart)
	config.bedtime = parsehumantime(config.bedtime)
	return config
}

function get_sleeps(token, time) {
	return sleepcloud_fetch.token(token, {timestamp: +time})
}

function pad2(x) {
	return x < 10 ? '0' + x : x
}
function makehumantime(date) {
	const d = new Date(date)
	return d.getHours()+':'+pad2(d.getMinutes())
}
function comment(d) {
	return `sleepcloud ${makehumantime(d.fromTime)} - ` +
					  `${makehumantime(d.toTime)} (${(d.lengthMinutes / 60).toFixed(2)})`
}
function parsehumantime(time) {
	const time_split = time.split(':')
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
	const day_sets = {}
	// calculate the day to submit the sleeps on
	// and sort them by that day into an object
	sleeps.forEach(function(sl) {
		const from_time = new Date(sl.fromTime)
		const target_day = clone_date(from_time)
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
			sleep: day_sets[target_day].sort((a, b) => a.fromTime - b.fromTime)[0]
		}
	})
}
function stayed_up(target_day, bedtime, daystart, fromTime) {
	const this_bedtime = clone_date(target_day)
	this_bedtime.setHours(...bedtime)
	if (time_gte(bedtime[0], bedtime[1], daystart[0], daystart[1])) {
		// the bedtime is before 00:00
		// so it's currently a day late
		this_bedtime.setDate(this_bedtime.getDate()-1)
	}
	return ((fromTime - this_bedtime) / 1e3 / 60 / 60).toFixed(2)
}


function report({daystart, bedtime, beeminder, sleepcloud}) {
	const b = new Beeminder(beeminder.auth)
	return b.get('users/me/goals/'+beeminder.goal, {datapoints:true})
	.then((res) => {
		const last_point = new Date(res.datapoints[res.datapoints.length-1].timestamp*1e3)
		last_point.setHours(...daystart)
		console.log('getting data from', last_point)
		return get_sleeps(sleepcloud.user_token, last_point)
	}).then(({sleeps}) => {
		// find the earliest sleep for one day, starting at 16:00 or so
		const day_sleep = find_earliest_sleeps(sleeps, daystart)
		const sorted_sleep = day_sleep.sort((a, b) => a.target_day - b.target_day)
		const submit_data = sorted_sleep.map(function({target_day, sleep}) {
			const stayed_up_length = stayed_up(target_day, bedtime, daystart, sleep.fromTime)

			// the timestamps on beeminder are on 17:00
			const timestamp = clone_date(target_day).setHours(17, 0, 0) / 1e3
			console.log(`${clone_date(target_day).getDate()} ${stayed_up_length} "${comment(sleep)}"`)

			return {
				timestamp,
				value: stayed_up_length,
				comment: comment(sleep)
			}
		})
		if (submit_data.length) {
			b.post('users/me/goals/'+beeminder.goal+'/datapoints/create_all',
				{datapoints: JSON.stringify(submit_data)}).then(() => console.log("data submitted"))
		} else {
			console.log('Nothing to submit')
		}
	})
}

report(read_config())
