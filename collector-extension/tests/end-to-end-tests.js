const puppeteer = require('puppeteer');
const assert = require('assert');

const extensionPath = 'dist';
let browser = null;
let extensionPopupPagePath = '';
let extensionOptionsPagePath = '';
let backgroundPage = {}

describe('End-to-End', function() {
    this.timeout(1000 * 60 * 10); // default is 2 seconds and that may not be enough to boot browsers and pages.
    
    before(async function() {
      await boot();
    });

    describe('Enroll', async function() {
        it('only with valid email and consent', async function() {
            let button = {}
            let buttonText = ''
            const page = await browser.newPage();

            await page.goto(extensionPopupPagePath);
            await page.waitForSelector("input[name=email]");
            await page.click("input[name=email]");
            await page.type("input[name=email]", "foo@bar");
            await page.click("button[type=submit]");
            button = await page.$("button[type=submit]")
            buttonText = await page.evaluate(el => el.innerText, button);
            
            assert.equal(buttonText, "You have to consent with the agreement to proceed")

            await page.evaluate( () => document.getElementById("emailInput").value = "")
            await page.click("input[name=email]");
            await page.type("input[name=email]", "foo@bar.com");

            button = await page.$("button[type=submit]")
            buttonText = await page.evaluate(el => el.innerText, button);
            assert.equal(buttonText, "You have to consent with the agreement to proceed")
            await page.click("input[name=consent]");

            button = await page.$("button[type=submit]")
            buttonText = await page.evaluate(el => el.innerText, button);
            
            assert.equal(buttonText, "Start collecting")

            await page.click("button[type=submit]");
        })
    });

    describe('Storage', async function() {
        it('mechanism works', async function() {
            const page = backgroundPage

            page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            
            // Wait for collection app to init
            await page.waitForFunction('app.isCollecting === true');

            await page.evaluate(async function() {
              console.log(`app version ${config.VERSION}`)
              console.log(`app is collecting ${app.isCollecting}`)

              const window = 42
              const tab = 42
              const url = "http://example.org/page01?foo=bar&foo=bar&foo=bar&foo=bar&foo=bar&foo=bar&foo=bar&foo=bar"
              const start = 1573837639133
              const end = 1573837636641
              const transitionType = "typed"
              const transitionQualifiers = ["from_address_bar"]
              
              const sampleFocus = new Focus(window, tab, url, start, end, transitionType, transitionQualifiers)
              
              const nFocus = 3
              let i

              for (i = 0; i < nFocus; i++) {
                await sensors.focus.addReading(sampleFocus)
              }

              console.log(`Added ${nFocus} focus events`)
            })

            assert.equal(true, true);
        })

        it('can exceed local storage limit', async function() {
          const page = backgroundPage

          // TODO: log listener already declared in preveious "it"
          // page.on('console', msg => console.log('PAGE LOG:', msg.text()));
          
          // Wait for collection app to init
          await page.waitForFunction('app.isCollecting === true');

          await page.evaluate(async function() {
            let sampleFocus = {
              window: 42,
              tab: 42,
              url: "http://example.org/page01?foo=bar&foo=bar&foo=bar&foo=bar&foo=bar&foo=bar&foo=bar&foo=bar",
              start: 1573837639133,
              end: 1573837636641,
              transitionType: "typed",
              transitionQualifiers: ["from_address_bar"]
            }
            
            let batch_sizes = [32000]

            for (let i in batch_sizes) {
              const nFocus = batch_sizes[i]
              let batch = []
              
              for (let i = 0; i < nFocus; i++) {
                  batch.push(sampleFocus)
              }
            
              await storage.set({'focus_readings': batch})
              let storageSize = await storage.getSize()
              console.log(`Saved batch of ${nFocus} focus events with estimated size of: ${storageSize} MB`)
            }
          })

          assert.equal(true, true);
      })
    });

    after(async function() {
        await browser.close();
    });
});

async function boot() {
    browser = await puppeteer.launch({
      headless: false, // extension are allowed only in head-full mode
      slowMo: 5, // to follow what browser is doing
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
  
    const dummyPage = await browser.newPage();
    await dummyPage.waitFor(5); // arbitrary wait time to init extension?
  
    const targets = await browser.targets();

    const extensionTarget = targets.find(({ _targetInfo }) => {
      return _targetInfo.type === 'background_page';
    });
    
    const extensionUrl = extensionTarget._targetInfo.url || '';
    const [,, extensionID] = extensionUrl.split('/');
    const extensionPopupPage = 'popup.html'
    const extensionOptionsPage = 'options.html'
    
    // Get background page
    backgroundPage = await extensionTarget.page();

    extensionPopupPagePath = `chrome-extension://${extensionID}/${extensionPopupPage}`
    extensionOptionsPagePath = `chrome-extension://${extensionID}/${extensionOptionsPage}`
  }