/*
 * Background.js
 *
 */
function Config () {
  const self = this
  const seconds = 1000
  const minutes = seconds * 60
  const hours = minutes * 60
  const days = hours * 24

  var manifestData = chrome.runtime.getManifest()
  self.VERSION = manifestData.version
  self.COLLECTION_PERIOD_UNIT = days
  self.COLLECTION_PERIOD = 10 * self.COLLECTION_PERIOD_UNIT
  self.COLLECTION_PERIOD_UNIT_NAME = 'Days'
  self.FOCUS_DURATION_THRESHOLD = 1 * seconds
  self.API_URL = 'https://user-studies.brave.com/'
}

function Util () {
  const self = this

  self.getTime = function () {
    return Date.now()
  }

  self.uuidv4 = function () {
    // Taken from https://stackoverflow.com/a/2117523
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4)
        .toString(16)
    )
  }
}

// Shims, e.g. synchronous storage use
function Storage () {
  const self = this

  self.get = function (key) {
    return new Promise(function (resolve, reject) {
      chrome.storage.local.get(key, function (data) {
        if (data[key]) {
          resolve(data[key])
        } else {
          reject(key + ' not found')
        }
      })
    })
  }

  self.getAll = function () {
    return new Promise(function (resolve) {
      chrome.storage.local.get(function (data) {
        resolve(data)
      })
    })
  }

  self.set = function (data) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(data, function () {
        resolve(data)
      })
    })
  }

  self.remove = function (key) {
    return new Promise(function (resolve) {
      chrome.storage.local.remove(key, function () {
        resolve(key)
      })
    })
  }

  self.clear = function () {
    return new Promise(function (resolve) {
      chrome.storage.local.clear(function () {
        var error = chrome.runtime.lastError
        if (error) {
          reject(error)
        }
        resolve()
      })
    })
  }

  self.getSize = async function () {
    // Taken from https://stackoverflow.com/a/6326411
    // Returns size of local storage in MB
    const localStorage = await self.getAll()
    return JSON.stringify(localStorage).length * 2 / 1000000
  }
}

const log = function (msg) {
  console.log(msg)
}

/*
 * Sensors
 *
 */
function Sensor (measure, client, storage, api, config, app) {
  const self = this

  self.measure = measure
  self.client = client
  self.storage = storage
  self.api = api
  self.config = config
  self.app = app
  self.storageKey = self.measure.name + '_readings'

  self.init = async function () {
    self.measure.init(self)

    // Initialize storage
    try {
      await self.storage.get(self.storageKey)
      log(self.storageKey + ' storage did exist')
    } catch (e) {
      const data = {}
      data[self.storageKey] = []
      await self.storage.set(data)
      log(self.storageKey + ' storage created')
    }

    return new Promise(function (resolve) {
      resolve()
    })
  }

  self.addReading = async function (reading) {
    try {
      const readings = await self.storage.get(self.storageKey)

      readings.push(reading)
      const data = {}
      data[self.storageKey] = readings

      await self.storage.set(data)
      log(self.measure.name + ': added reading')
    } catch (e) {
      log(e)
    }
  }

  self.clearReadings = async function () {
    try {
      const data = {}
      data[self.storageKey] = []

      await self.storage.set(data)
    } catch (e) {
      log(e)
    }
  }

  self.sendReadings = async function () {
    try {
      const readings = await self.storage.get(self.storageKey)
      const data = {
        clientId: self.client.id,
        sensor: self.measure.name,
        readings: readings
      }

      const response = await self.api.post('readings', data)
      log(self.measure.name + ' send readings ' + response)
    } catch (e) {
      log(e)
      return false
    }

    return true
  }
}

/*
 * Server/Client
 *
 */
function Client (storage, util, api, config) {
  const self = this

  self.id = ''
  self.consent = false
  self.storage = storage
  self.util = util
  self.config = config
  self.api = api

  self.init = async function () {
    try {
      self.id = await self.storage.get('client_id')
      log('Client ID did exist')
    } catch (e) {
      self.id = util.uuidv4()
      await self.storage.set({ client_id: self.id })
      log('Created client ID')
    }

    try {
      self.consent = await self.storage.get('consent')
    } catch (e) {
      self.consent = false
    }
    log('Client consented: ' + self.consent)
  }

  self.giveConsent = async function (email) {
    try {
      const data = {
        clientId: self.id,
        consent: true,
        email: email
      }

      const response = await self.api.post('consents', data)

      if (response === 'ok') {
        self.consent = true
        await self.storage.set({ consent: true })
      }
    } catch (e) {
      log(e)
      return
    }

    log('Send consent request and set to ' + self.consent)
  }
}

function Api (url) {
  const self = this

  self.baseUrl = url

  self.get = async function (endpoint) {
    const url = self.baseUrl + endpoint
    const response = await fetch(url, {
      method: 'GET'
    })
    const data = response.text()

    return data
  }

  self.post = async function (endpoint, payload) {
    const url = self.baseUrl + endpoint
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    const data = response.text()

    return data
  }
}

/*
 * Measures
 *
 */
function TransitionInfo (type, qualifiers, tabId, url) {
  const self = this

  self.type = type
  self.qualifiers = qualifiers
  self.tabId = tabId
  self.url = url
}

function Focus (window, tab, url, start, end, transitionType, transitionQualifiers) {
  const self = this

  self.window = window
  self.tab = tab
  self.url = url
  self.start = start
  self.end = end
  self.transitionType = transitionType
  self.transitionQualifiers = transitionQualifiers
}

function FocusMeasure (durationThreshold, util) {
  const self = this

  self.name = 'focus'
  self.sensor = {}
  self.durationThreshold = durationThreshold
  self.browserInFocus = false
  self.currentFocus = {}
  self.previousFocus = {}
  self.latestTransitionInfos = []

  self.changeFocusTo = function (focus) {
    // Keep current focus and transitionInfo if URL didn't change
    if (self.currentFocus.url === focus.url) {
      return
    }

    // Collect latest transitionInfo for focus tab
    const transitionInfo = self.latestTransitionInfos[self.currentFocus.tab]

    if (transitionInfo) {
      self.currentFocus.transitionType = transitionInfo.type
      self.currentFocus.transitionQualifiers = transitionInfo.qualifiers
    }

    // End current focus and make measurement
    if (self.currentFocus.url) {
      self.currentFocus.end = util.getTime()

      const duration = self.currentFocus.end - self.currentFocus.start
      if (duration > self.durationThreshold) {
        self.emit(self.currentFocus)
      }
    }

    // Set previous focus
    if (self.currentFocus.url) {
      self.previousFocus = self.currentFocus
    }

    // Set current focus
    self.currentFocus = focus
  }

  self.addTransitionInfo = function (transitionInfo) {
    // TODO: Doesn't account for opening a new tab with e.g. cmd+click while
    // staying on the current tab
    const tabId = transitionInfo.tabId
    self.latestTransitionInfos[tabId] = transitionInfo
  }

  self.init = function (sensor) {
    self.sensor = sensor

    // Set empty focus as initial focus
    self.currentFocus = new Focus()

    log(self.name + ' measure initialised')
  }

  self.emit = function (event) {
    self.sensor.addReading(event)
  }
}

function HistoryMeasure (util) {
  const self = this

  self.name = 'history'
  self.sensor = {}

  self.exportHistory = async function () {
    const lastUpdatedAt = await self.sensor.storage.get('last_updated_at')
    const currentTime = util.getTime()

    return new Promise(function (resolve) {
      chrome.history.search({
        text: '',
        startTime: lastUpdatedAt,
        endTime: currentTime,
        maxResults: 10000
      }, async function (history) {
        resolve(history)
      })
    })
  }

  self.init = async function (sensor) {
    self.sensor = sensor

    const installedAt = await self.sensor.storage.get('installedAt')
    self.sensor.storage.set({ last_updated_at: installedAt })

    log(self.name + ' measure initialised')
  }
}

/*
 * App
 *
 */
function App (measures, sensors, client, storage, api, config, util) {
  const self = this

  self.measures = measures
  self.sensors = sensors
  self.client = client
  self.storage = storage
  self.api = api
  self.util = util
  self.config = config
  self.installedAt = 0
  self.collectionEndTime = 0
  self.isCollecting = false
  self.didSendReadings = false

  self.calculateRemainingTime = function () {
    const delta = this.collectionEndTime - self.util.getTime()
    const remainingTime = (delta < 0) ? 0 : delta

    return remainingTime
  }

  self.init = async function () {
    try {
      self.installedAt = await self.storage.get('installedAt')
      log('Extension installed at : ' + self.installedAt)
    } catch(e) {
      log(e)
    }

    // Check if readings have been send before, if not set to false
    try {
      self.didSendReadings = await self.storage.get('didSendReadings')
    } catch (e) {
      await self.storage.set({ didSendReadings: self.didSendReadings })
    }
    log('App did send readings: ' + self.didSendReadings)

    // Check collectionEndTime
    try {
      const collectionTimes = await self.storage.get('collectionTimes')
      self.collectionEndTime = collectionTimes.end
    } catch (e) {
      log(e)
    }

    // Init required components
    await self.client.init()
    await sensors.focus.init()
    await sensors.history.init()

    // Check if API is alive
    try {
      const response = await self.api.get('')
      log('Api is ' + response)
    } catch (e) {
      log(e)
    }

    // On every script load check if collection is over, e.g. after computer
    // woke up (alarms won't trigger when chrome process wasn't running during
    // alarm time)
    if (self.calculateRemainingTime() === 0) {
      // Stop collecting
      self.isCollecting = false
      log('Remaining time on script load: ' + self.calculateRemainingTime())

      setBadgeInfo('!', '#ff3333')
    }

    if (self.client.consent === true && self.calculateRemainingTime() > 0) {
      self.isCollecting = true
      log('App is still collecting ' + self.isCollecting)

      setBadgeInfo('', '#5186ec')
    }

    log('App initialised')
  }
}

/*
 * Entry point
 *
 */
var config = new Config()
var util = new Util()
var storage = new Storage()
var api = new Api(config.API_URL)
var client = new Client(storage, util, api, config)

var measures = {
  focus: new FocusMeasure(config.FOCUS_DURATION_THRESHOLD, util),
  history: new HistoryMeasure(util)
}

var sensors = {
  focus: new Sensor(measures.focus, client, storage, api, config),
  history: new Sensor(measures.history, client, storage, api, config)
}

var app = new App(measures, sensors, client, storage, api, config, util)

// Init app on every script load
app.init()

/*
 * Event Listeners
 *
 */
// Background script doesn't necessarily load on startup of chrome so
// wake up background script with log
chrome.runtime.onStartup.addListener(function () {
  log('brwoser did start up')
})

chrome.runtime.onInstalled.addListener(function () {
  const installedAt = util.getTime()
  app.installedAt = installedAt
  storage.set({ installedAt: installedAt })
  log('Extension installed at : ' + app.installedAt)

  setBadgeInfo('!', '#ff3333')
})

// App: Initialize listeners
chrome.runtime.onMessage.addListener(function (request) {
  if (request.type === 'startCollectionRun') {
    app.isCollecting = true
    log('Start collection run, set isCollecting to ' + app.isCollecting)

    const startTime = util.getTime()
    const endTime = startTime + config.COLLECTION_PERIOD

    const collectionTimes = { start: startTime, end: endTime }

    app.collectionEndTime = collectionTimes.end
    storage.set({ collectionTimes: collectionTimes })

    log('Collection start and end times are saved')

    chrome.alarms.create('endCollectionRun', { when: app.collectionEndTime })

    log('Set alarm to ' + app.collectionEndTime)
  }
})

chrome.runtime.onMessage.addListener(async function (request) {
  if (request.type === 'sendReadings') {
    if (client.consent === false) {
      log('Not authorised: Client has no consent')
      return false
    } else if (app.isCollecting === true) {
      log('Not authorised: App is still collecting')
      return false
    } else if (app.didSendReadings === true) {
      log('Not authorised: App did send readings already')
      return false
    }

    if (!await measures.focus.sensor.sendReadings()) {
      log('Failed to send readings. Try again later')
      return
    }

    // Export history readings
    const history = await measures.history.exportHistory()
    await measures.history.sensor.addReading(history)
    log('Exported history readings during "sendReadings"')

    if (!await measures.history.sensor.sendReadings()) {
      log('Failed to send readings. Try again later')
      return
    }

    // Save send request
    storage.set({ didSendReadings: true })
    app.didSendReadings = true
    log('Set didSendReadings to ' + app.didSendReadings)
  }
})

// Client: Register listeners
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'giveConsent') {
    log('Using email: ' + request.email + ' (not stored locally)')

    client.giveConsent(request.email)
    sendResponse({ consent: true, clientId: client.id })

    setBadgeInfo('', '#5186ec')
  }

  return true
})

// Focus Measure: Register listeners
// FOCUS: New URL in active tab in current window
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (client.consent === false) {
    log('Not authorised: Client has no consent')
    return false
  } else if (app.isCollecting === false) {
    log('Not authorised: App is not collecting')
    return false
  }

  chrome.tabs.query({ active: true, status: 'complete', currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      const tab = tabs[0]

      const focus = new Focus(tab.windowId, tab.id, tab.url, util.getTime())
      measures.focus.changeFocusTo(focus)
    }
  })
})

// FOCUS: Switched to a tab that was already loaded
chrome.tabs.onActivated.addListener(function (activeInfo) {
  if (client.consent === false) {
    log('Not authorised: Client has no consent')
    return false
  } else if (app.isCollecting === false) {
    log('Not authorised: App is not collecting')
    return false
  }

  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    if (tabs[0]) {
      const tab = tabs[0]

      const focus = new Focus(tab.windowId, tab.id, tab.url, util.getTime())
      measures.focus.changeFocusTo(focus)
    }
  })
})

// FOCUS: Switched browser window and stay on active tab in new window
chrome.windows.onFocusChanged.addListener(function (activeInfo) {
  if (client.consent === false) {
    log('Not authorised: Client has no consent')
    return false
  } else if (app.isCollecting === false) {
    log('Not authorised: App is not collecting')
    return false
  }

  // Switch browser windows
  chrome.tabs.query({ active: true, status: 'complete', currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      const tab = tabs[0]

      const focus = new Focus(tab.windowId, tab.id, tab.url, util.getTime())
      measures.focus.changeFocusTo(focus)
    }
  })

  // Browser won/lost focus
  if (activeInfo === chrome.windows.WINDOW_ID_NONE) {
    measures.focus.browserInFocus = false

    const focus = new Focus() // Submit dummy focus
    measures.focus.changeFocusTo(focus)
  } else {
    measures.focus.browserInFocus = true
  }
})

chrome.webNavigation.onCommitted.addListener(function (details) {
  const transitionInfo = new TransitionInfo(
    details.transitionType,
    details.transitionQualifiers,
    details.tabId,
    details.url
  )

  measures.focus.addTransitionInfo(transitionInfo)
})

chrome.alarms.onAlarm.addListener(async function (alarm) {
  if (alarm.name === 'endCollectionRun') {
    log('Alarm: Collection run ended')

    if (app.calculateRemainingTime() === 0) {
      // Stop collecting
      app.isCollecting = false
      log('Remaining time on script load: ' + app.calculateRemainingTime())

      setBadgeInfo('!', '#ff3333')
    }
  }
})

const setBadgeInfo = function (text, color) {
  chrome.browserAction.setBadgeText({ text: text })
  chrome.browserAction.setBadgeBackgroundColor({ color: color })
}
