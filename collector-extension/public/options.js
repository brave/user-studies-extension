/*
 * Options.js
 *
 */
const log = function (msg) {
  console.log(msg)
}

chrome.runtime.getBackgroundPage(async function (backgroundPage) {
  // Export history
  let history = []

  if (backgroundPage.app.didSendReadings === false) {
    history = await backgroundPage.app.measures.history.exportHistory()
  }

  chrome.storage.local.get(function (result) {
    result.history_readings.push(history)
    showData(result)
  })
})

function showData(data) {
  var dataStr = JSON.stringify(data, undefined, 2)
  document.body.appendChild(document.getElementById('data')).innerText = dataStr
}
