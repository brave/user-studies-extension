<template>
    <div id="templateRoot">
        <div v-if="loading" id="loading" class="contentBoxPadding">
            <!-- From https://github.com/SamHerbert/SVG-Loaders -->
            <img src="./assets/img/loader.svg" />
        </div> <!-- // Loading -->
        
        <div v-if="!loading && !consent" class="contentBoxPadding">
            <div id="agreement">
                <h1>Research Participation Agreement</h1>

                <p>Before you can start collecting readings you need to read and consent to the research participation agreement outlined below:</p>

                <div id="agreementText">
                    <p>I agree to participate in a research study performed by Brave Software. I understand that this study is being conducted in order to identify opportunities for design.</p>
                    <p>I understand that the research method includes the installation of this browser extension which collects browsing behaviour data such as date and time spent on websites, information about resources requested by each website or the date and time a Brave advert was delivered.</p>
                    <p>I grant my permission for the data to be stored for 1 year and to only be used by the Brave Research Team for the purposes of improving Brave Software's products and services. I understand that any identifiable information, such as my name or email, will be removed from any material that is made available to those not directly involved in the study.</p>
                    <p>I understand that my data will be processed in the US, using services certified under the EU-US Privacy Shield agreement, which provides me with <a href="https://www.privacyshield.gov/article?id=My-Rights-under-Privacy-Shield" target="blank">rights and safeguards</a> that are intended to be equivalent to those provided in the EU. I understand that I can complain to a <a href="http://ec.europa.eu/justice/data-protection/article-29/structure/data-protection-authorities/index_en.htm"  target="blank">data protection authority</a> in my country.</p>
                </div>

                <p>We use the email to send you a friendly reminder that you can preview and submit your readings when the collection period is over or how to opt-out in case you've changed your mind:</p>

                <label for="emailInput" class="emailInput">
                    <input id="emailInput" name="email" placeholder="Enter Your Email Address" v-model="email">
                </label>
                <label for="consentCheckbox" class="important">
                    <input type="checkbox" name="consent" id="consentCheckbox" v-model="checked">
                    I consent with the agreement outlined above
                </label>

                <button :disabled="!emailAndChecked" v-on:click="giveConsent()" type=submit>
                    {{ emailAndChecked ? 'Start collecting' : 'You have to consent with the agreement to proceed' }}
                </button>
            </div>
        </div> <!-- // Not loading, no consent -->

        <div v-if="!loading && consent" class="contentBoxNoPadding">
            <div v-if="consent" class="bar">
                <div id="progressBox">
                    <div id="progressValue"><span>Progress: </span> {{ delta }} <span>of</span> {{ collectionPeriod }} <span>{{ collectionPeriodUnitName }}</span></div>
                    <div id="progressTitle">Collection Period</div>
                </div>
                <button id="sendButton" :disabled="buttonState !== 'You can submit your readings now'" v-on:click="sendReadings()">
                    {{ buttonState }}
                </button>
            </div>
        </div> <!-- // Not loading, consent -->

        <div v-if="!loading && consent" class="contentBoxPadding">
            <div class="highlight">
                ID: {{ clientId }}
            </div>

            <div v-if="showMessage4" class="message">
                <span v-html="emojiSurvey"></span>Participate in our <a href="#">post-collection survey</a>.
            </div>

            <div v-if="showMessage3" class="message">
                <span v-html="emojiThanks"></span> Thank you for sending the readings! You can now remove this extension from within the extensions settings page of your browser.
            </div>

            <div v-if="showMessage2" class="message">
                <span v-html="emojiInfo"></span> You can submit your readings now or <a href="./options.html" target="blank">preview the data</a> that was collected and only submit if you feel comfortable.
            </div>

            <div v-if="showMessage1" class="message">
                <span v-html="emojiWelcome"></span>Thank you for participating in this program. This study will collect browsing data for {{ collectionPeriod }} {{ collectionPeriodUnitName }}. You can always have a look at the <a href="./options.html" target="blank">collected data</a>.
            </div>

            <h2 class="toggle" v-on:click="showSupport=!showSupport">Contact & Support (click to see)</h2>
            <ul v-if="showSupport">
                <li>Send us an email at <a href="mailto:user-studies@brave.com">user-studies@brave.com</a></li>
            </ul>

            <h2 class="toggle" v-on:click="showInfo=!showInfo">Extension Info (click to see)</h2>
            <ul v-if="showInfo">
                <li>Version: {{ version }}</li>
                <li>Installed at: {{ installedAt }}</li>
                <li>Data Size (Local Storage): {{ storageSize + ' MB' }}</li>
            </ul>
        </div> <!-- // Not loading, consent -->
    </div>
</template>

<script>
export default {
  data () {
    return {
      collectionApp: {},
      collectionPeriodMs: 0,
      collectionPeriodUnit: 0,
      collectionPeriodUnitName: '',
      installedAtMs: 0,
      loading: true,
      sending: false,
      consent: false,
      checked: false,
      email: '',
      didSendReadings: false,
      emojiThanks: '&#x1F60A',
      emojiSurvey: '&#x270D',
      emojiInfo: '&#x2757',
      emojiWelcome: '&#x1F44B',
      showReadings: false,
      showSupport: false,
      showInfo: false,
      showMessage1: true
    }
  },
  computed: {
    emailAndChecked: function() {
        return this.checked && this.validateEmail(this.email)
    },
    showMessage2: function() {
        if (this.remainingTimeMs > 0) {
            return false
        } else {
            return true
        }
    },
    showMessage3: function() {
        if (this.didSendReadings === true) {
            return true
        } else {
            return false
        }
    },
    showMessage4: function() {
        if (this.didSendReadings === true) {
            return true
        } else {
            return false
        }
    },
    buttonState: function() {
        if (this.didSendReadings === true) {
            return 'Thank you for sending the readings'
        } else if (this.remainingTimeMs > 0) {
            return 'Submit readings when collection period is over'
        } else if (this.sending === true) {
            return 'Sending, this might take a while...'
        } else {
            return 'You can submit your readings now'
        }
    },
    collectionPeriod: function() {
        return this.collectionPeriodMs / this.collectionPeriodUnit
    },
    remainingTimeMs: function() {
        return this.getRemainingTimeMs() // Delegate to functino bc. Date.now() would be cached
    },
    delta: function() {
        return Math.round((this.collectionPeriodMs - this.remainingTimeMs) / this.collectionPeriodUnit)
    },
    installedAt: function() {
        return new Date(this.installedAtMs).toLocaleString()
    }
  },
  methods: {
    validateEmail: function(email) {
        // Taken from https://stackoverflow.com/a/46181
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    },
    giveConsent: function() {
      const self = this
      chrome.runtime.sendMessage({type: "giveConsent", email: this.email}, function(response) {
          self.consent = response.consent
          self.clientId = response.clientId

          if (self.consent === true) {
              self.startCollectionRun()
          }
      });
    },
    startCollectionRun: function() {
        chrome.runtime.sendMessage({type: "startCollectionRun"});
    },
    getRemainingTimeMs: function() {
        return this.collectionApp.calculateRemainingTime()
    },
    sendReadings: function() {
      const self = this
      self.sending = true

      chrome.runtime.sendMessage({ type: "sendReadings" })

      // Periodically ping background page
      function pingSubmissionStatus() {
          setTimeout(async function () {
                console.log('Ping background script for sending status...')
                
                await chrome.runtime.getBackgroundPage(async function(backgroundPage) {
                    self.didSendReadings = backgroundPage.app.didSendReadings
                })

                console.log('Did send readings: ' + self.didSendReadings)

                if (self.didSendReadings === true) {
                    self.sending = false
                } else {
                    pingSubmissionStatus()
                }
          }, 1000)
      }

      pingSubmissionStatus()
    }
  },
  created() {
    // Get app state from background page
    let self = this;

    chrome.runtime.getBackgroundPage(async function(backgroundPage) {
        self.collectionApp = backgroundPage.app
        
        self.installedAtMs = backgroundPage.app.installedAt
        
        self.version = backgroundPage.config.VERSION;
        self.collectionPeriodUnitName = backgroundPage.config.COLLECTION_PERIOD_UNIT_NAME;
        self.collectionPeriodUnit = backgroundPage.config.COLLECTION_PERIOD_UNIT;
        self.collectionPeriodMs = backgroundPage.config.COLLECTION_PERIOD;

        try {
            self.clientId = await backgroundPage.storage.get('client_id')
        } catch(e) {
            self.clientId = ''
        }
        
        try {
            self.consent = await backgroundPage.storage.get('consent')
        } catch(e) {
            self.consent = false
        }

        self.storageSize = await backgroundPage.storage.getSize();
        self.didSendReadings = backgroundPage.app.didSendReadings

        // Delay to prevent flashing screen
        setTimeout(function () {
            self.loading = false;
        }, 350);
    });
  }
}
</script>

<style>
    .contentBoxPadding {
        padding: 15px;
    }

    .contentBoxNoPadding {
        padding: 0;
    }

    a:link, a:visited {
        color: rgb(76, 84, 210);
        text-decoration: none;
    }
    
    a:hover, a:active {
        color: rgb(76, 84, 210, 0.75);
        text-decoration: none;
    }

    p {
        text-align: left;
        padding: 0;
        margin: 15px 0;
    }

    h1 {
        color: rgb(76, 84, 210);
        font-size: 1.4em;
    }

    h2 {
        color: rgb(76, 84, 210);
        font-size: 1em;
        display: block;
        text-align: center;
    }

    h2.toggle {
        cursor: pointer;
    }

    ul {
        margin: 0;
        padding: 0 25px;
    }

    ul li {
        list-style-type: none;
        text-align: center;
        margin: 7px 0;
    }

    label {
        cursor:pointer;
    }

    button {
        background: linear-gradient(180deg, rgb(100, 66, 173, 0.8), hsl(259, 45%, 47%));
        color: rgb(255, 255, 255, 0.9);
        padding: 10px 15px;
        margin: 10px 0;
        font-size: 0.9em;
        border: none;
        border-radius: 3px;
        cursor:pointer;
    }

    button:hover {
        background: linear-gradient(180deg, rgb(100, 66, 173, 0.8), rgb(100, 66, 173, 0.8));
    }

    button:active {
        background: linear-gradient(180deg, rgb(100, 66, 173, 0.9), rgb(100, 66, 173, 0.9));
    }

    button:disabled, button[disabled] {
        background: linear-gradient(180deg, rgb(100, 66, 173, 0.75), rgb(100, 66, 173, 0.75));
        color: rgb(255, 255, 255, 0.5);
    }

    .message {
        display: block;
        background: rgb(76, 84, 210, 0.1);
        border: 2px solid rgb(76, 84, 210, 0.2);
        padding: 10px;
        margin: 10px 0;
        border-radius: 3px;
    }

    .message .close {
        margin-left: 15px;
        color: rgb(76, 84, 210, 0.2);
        font-weight: bold;
        float: right;
        font-size: 20px;
        line-height: 13px;
        cursor: pointer;
        transition: 0.3s;
    }

    .message .close:hover {
        color: rgb(76, 84, 210, 0.4);
    }

    .highlight {
        display: block;
        background: #f2f2f2;
        border: 2px solid #cccccc;
        color: #b6b6b6;
        padding: 10px;
        border-radius: 3px;
    }

    label.emailInput {
        display: block;
        position: relative;
        margin: 5px 0 10px 0;
    }

    .emailInput input {
        color: rgb(75, 76, 92);
        width: 325px;
        padding: 7px 12px;
        background: #FFFFFF;
        border: 2px solid #cccccc;
        font-size: 1.1em;
        border-radius: 3px;
    }

    .important {
        display: block;
        background: rgb(211, 65, 84, 0.1);
        border: 2px solid rgb(211, 65, 84, 0.3);

        padding: 10px;
        border-radius: 3px;
    }

    div#loading {
        height: 385px;
        position:relative;
    }

    div#loading img {
        position: absolute;
        top: 170px;
        left: 170px;
    }

    div#agreementText {
        height: 200px;
        overflow: scroll;
        border: 2px solid #d4d4d4;
        border-radius: 3px;
        padding: 0 15px;
        margin: 10px 0 15px 0;
    }

    div#agreementText p {
        text-align: left;
    }

    div#agreement button {
        width: 100%;
    }

    div.bar {
        background: linear-gradient(0deg, rgb(100, 66, 173, 1), rgb(52, 44, 201));
        padding: 48px 32px 24px 32px;
        background-size: cover;
    }

    div#progressBox {
        text-align: center;
    }

    div#progressValue {
        color: rgb(255, 255, 255);
        font-size: 2.5em;
    }

    div#progressValue span {
        font-size: 0.5em;
        color: rgb(255, 255, 255, 0.7);
        font-weight: lighter;
    }

    div#progressTitle {
        color: rgb(255, 255, 255, 0.7);
        font-size: 0.9em;
        font-weight: lighter;
    }

    button#sendButton {
        width: 100%;
        margin: 28px 0 0 0;
        background: linear-gradient(180deg, rgb(211, 65, 84, 0.8), rgb(211, 65, 84, 1.0));
    }

    button#sendButton:hover {
        background: linear-gradient(180deg, rgb(211, 65, 84, 0.8), rgb(211, 65, 84, 0.8));
    }

    button#sendButton:active {
        background: linear-gradient(180deg, rgb(211, 65, 84, 0.9), rgb(211, 65, 84, 0.9));
    }

    button#sendButton:disabled, button#sendButton[disabled] {
        background: linear-gradient(180deg, rgb(211, 65, 84, 0.75), rgb(211, 65, 84, 0.75));
        color: rgb(255, 255, 255, 0.5);
    }
</style>
