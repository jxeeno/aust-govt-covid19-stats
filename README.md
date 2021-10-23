# Australian COVID-19 Case & Test Stats Data

This repository is a mess of code which:

1. Takes in the data tables published by the Federal Department of Health (https://www.health.gov.au/news/health-alerts/novel-coronavirus-2019-ncov-health-alert/coronavirus-covid-19-current-situation-and-case-numbers).  It doesn't touch the graphs at this stage.
2. Converts it into machine-readable statistics (JSON and CSV files)
3. Publishes data files via Github Actions and Github Pages

Data scraping commenced on 26th April 2021.  Scraped data is not available for prior this period.

**Looking for COVID-19 Vaccination Data?** That data is in a separate repository: https://github.com/jxeeno/aust-govt-covid19-vaccine-pdf

## Direct access to data

The data is also available at the following locations:

* **CSV (all):** https://govtstats.covid19nearme.com.au/data/all.csv
* **JSON (all):** https://govtstats.covid19nearme.com.au/data/all.json

**Important note about data quality:**  This data is provided as-is. I'm not guaranteeing the timeliness or accuracy of any data provided above.  Use at your own risk.

The data files above are usually updated daily.  Github Actions is configured to scrape and extract data from the Department of Health website when the department usually updates the data at 8pm.

The action will trigger at:
* ~8pm AEST (8:00pm, 8:02pm, 8:05pm, 8:10pm)
* and hourly at 13 past the hour thereafter

The scrape data is then published via Github Pages.  The data is also available via this git repo in under `docs/data`.

Documentation for these data files will come in due course.

## To run yourself

You can also run this code yourself.  You'll need:

* Google Chrome (for pupeteer)
* Yarn (or NPM) to install JS dependencies
* Node (not sure what version but I'm running v12.x)

```bash
git clone https://github.com/jxeeno/aust-govt-covid19-stats.git
cd aust-govt-covid19-stats
yarn # or: npm install
node scrape.js
node create-legacy-data.js
node generate-csv.js
```

## Help

### Why did you build this?

Because for some reason, our Health department reckons the best way to provide statistical data is through an embedded data visualisation graphic instead of a data file.  Ok, this doesn't actually sound too bad at first -- but the data isn't easily scrapable because it it's dynamically loaded through WebSockets 🙃, hence this repository.

This data should be available in machine readable formats for transparency and to enable ease of access.

### Oh no, it's broken

Yeah, that's probably going to happen.  Every time the Health department makes changes to the page or data visualisation, this thing will break.

You can try and fix it and submit a PR.  Or raise an issue and I'll have a look at it.

### Why is the code so bad?

Yeah, it's spaghetti code because it's basically disposable code. I expect to need to rewrite this every few days.

Having said that, you're welcome to raise a PR if you want to make it better! :)

## Data issues

Department of Health occasionally forgets to update the dashboard.  When this occurs, we don't have valid data for that day and omit it from the dataset.  The applies to the following days:

* 31st July 2021
* 6th Oct 2021
* 13th Oct 2021
* 22nd Oct 2021
