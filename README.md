Beeminder-sleepcloud
=======

This is a node.js script, intended to run as a cronjob, to automatically submit data from [Sleep as Android](https://play.google.com/store/apps/details?id=com.urbandroid.sleep) (using the [SleepCloud addon](https://play.google.com/store/apps/details?id=com.urbandroid.sleep.addon.port) to [beeminder](https://www.beeminder.com/) (set up using a 'do less' goal, in order to limit the time spent awake after the 'bedtime', but you can easily adapt the code to mind sleep length or wake-up time).

Installation
=====

```sh
git clone https://github.com/yorickvP/beeminder-sleepcloud
cd beeminder-sleepcloud
npm install
# edit 'auth' in config.json to point to your beeminder auth token
# found at https://www.beeminder.com/api/v1/auth_token.json
# set your bedtime and daystart in config.json (daystart explained below)
node report.js
```
The first time, the script will open a webbrowser to authenticate with google to access your sleepcloud data (or, if this is not possible, spit out a link to go to).
The `daystart` config option is the time after which sleeps count towards a new day (the first sleep time after this is taken as the time you went to bed on a day).
