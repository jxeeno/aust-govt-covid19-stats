const puppeteer = require('puppeteer')
try {
    (async () => {
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.setViewport({ width: 1280, height: 800 })
        await page.goto('https://www.health.gov.au/news/health-alerts/novel-coronavirus-2019-ncov-health-alert/coronavirus-covid-19-current-situation-and-case-numbers')
        await page.waitForSelector('#widgetKdmpZ');
        const html = await page.$eval('#widgetKdmpZ', element => element.innerHTML);
        console.log(html);
        await browser.close()
    })()
} catch (err) {
    console.error(err)
}