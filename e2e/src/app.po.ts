import { browser, by, element } from 'protractor'
import * as fs from 'fs'
import * as protractor from 'protractor'

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

export class AppPage {
  private time = new Date()

  navigateTo() {
    return browser.get('/')
  }

  waitForAngular() {
    return browser.waitForAngular()
  }

  getParagraphText() {
    return element(by.deepCss('app-root ion-content')).getText()
  }

  sleep(time: number) {
    return browser.sleep(time)
  }

  takeScreenshot(page: string) {
    return browser
      .takeScreenshot()
      .then(async png => {
        const capabilities = await browser.getCapabilities()
        const config = await browser.getProcessedConfig()

        const platform = config.capabilities.chromeOptions.mobileEmulation
          ? slugify(config.capabilities.chromeOptions.mobileEmulation.deviceName)
          : 'desktop'

        console.log(platform, 'browser.takeScreenshot()')

        const stream = fs.createWriteStream(
          `./screenshots/${platform}/${page}-${this.time.getTime()}-screenshot.png` /* node >10 { recursive: true }*/
        )
        stream.write(Buffer.from(png, 'base64'))
        stream.end()
      })
      .catch(error => console.error('Cannot take screenshot', error))
  }
}
