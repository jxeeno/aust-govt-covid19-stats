const puppeteer = require('puppeteer')
const cheerio = require('cheerio')
const moment = require('moment')
const { format } = require('@fast-csv/format');
const fs = require('fs');
const path = require('path');
const lodash = require('lodash');

const DATA_RAW_JSON_PATH = 'docs/data/raw/';
const DATA_RAW_HTML_PATH = 'docs/data/rawhtml/';

const exportTable = (html, type) => {
    const $ = cheerio.load(html);
    const headerLine = $("h2").text().trim();

    let dateStr;
    const dateMatches = headerLine.match(/[0-9]+\/[0-9]+\/[0-9]{4}$/);
    if(dateMatches){
        dateStr = moment(dateMatches[0], 'DD/M/YYYY').format('YYYY-MM-DD');
    }

    if(!dateStr){
        console.error(`Could not match date in header: ${headerLine}`);
        return;
    }

    const data = {asAtDate: dateStr, type, entries: []};

    const $headerRow = $("thead tr:first");
    const headerRow = $headerRow.find("td,th").toArray().map(cell => $(cell).text().trim());

    $("tbody tr").each((i, row) => {
        const r = $(row).find("td,th").toArray().map(cell => $(cell).text().trim());
        data.entries.push(lodash.zipObject(headerRow, r));
    });

    const rawJsonPath = path.join(DATA_RAW_JSON_PATH, `${dateStr}.${type}.json`);
    fs.writeFileSync(rawJsonPath, JSON.stringify(data, null, 4))

    return data;
}

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--single-process',
                '--no-zygote',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-features=AudioServiceOutOfProcess'
            ]
        })
        const page = await browser.newPage()
        await page.setViewport({ width: 1280, height: 800 })
        await page.goto('https://www.health.gov.au/news/health-alerts/novel-coronavirus-2019-ncov-health-alert/coronavirus-covid-19-current-situation-and-case-numbers')

        const extractWidget = async (widgetId, scrapeKey) => {
            await page.waitForSelector(`#widget${widgetId}`);
            const html = await page.$eval(`#${widgetId}`, element => element.innerHTML);
            return exportTable(html, scrapeKey);
        };

        const d = await extractWidget('KdmpZ', 'cases');
        await extractWidget('zfDpnUy', 'tests');
        await extractWidget('gjjZnj', 'source');

        const html = await page.content();
        const htmlPath = path.join(DATA_RAW_HTML_PATH, `${d.asAtDate}.html`);
        if(!fs.existsSync(htmlPath)){
            fs.writeFileSync(htmlPath, html);
        }

        await browser.close()
    } catch (err) {
        console.error(err);

        if(browser){
            browser.exit();
        }
        
        process.exit();
    }
})()