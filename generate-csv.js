const fs = require('fs');
const path = require('path');
const { format } = require('@fast-csv/format');

const DATA_CSV_PATH = 'docs/data/all.csv';
const DATA_JSON_PATH = 'docs/data/all.json';
const RAW_JSON_DATA_PATH = 'docs/data/raw/';

const toNumber = str => Number(str.replace(/[,%]/g, ''));
const isNumber = str => !!str.trim().match(/^[0-9,%\.]+$/);

const SUFFIX_MAPPING = {
    'Active cases^': 'CASES_ACTIVE',
    'Active cases': 'CASES_ACTIVE',
    'Locally acquired last 24 hours': 'CASES_LOCAL_LAST_24H',
    'Overseas acquired last 24 hours': 'CASES_OVERSEAS_ACQUIRED_LAST_24H',
    'Under investigation last 24 hours': 'CASES_UNDER_INVESTIGATION_LAST_24H',
    'Locally acquired last 7 days': 'CASES_LOCAL_LAST_7D',
    'Overseas acquired last 7 days': 'CASES_OVERSEAS_ACQUIRED_LAST_7D',
    'Under investigation last 7 days': 'CASES_UNDER_INVESTIGATION_LAST_7D',

    "Tests in last 7 days": "TESTS_LAST_7D",
    "Tests in last 7 days per 100,000 population": "TESTS_PER_100K_LAST_7D",
    "Total tests": "TESTS_TOTAL",
    "Total positive tests (%)": "TESTS_POSITIVE_PCT",

    "Overseas": "SOURCE_OVERSEAS",
    "Locally acquired - contact of confirmed case": "SOURCE_LOCAL_CONFIRMED_CASE",
    "Locally acquired - unknown contact": "SOURCE_LOCAL_UNKNOWN_CONTACT",
    "Locally acquired - interstate travel": "SOURCE_LOCAL_INTERSTATE_TRAVEL",
    "Under investigation": "SOURCE_UNDER_INVESTIGATION",
    "Total cases": "CASES_TOTAL",
    "Total deaths": "DEATHS_TOTAL"
}

const generateCsv = async () => {
    const files = fs.readdirSync(RAW_JSON_DATA_PATH).filter(p => p.endsWith(".json"));

    const byDate = {};

    for(const file of files){
        const data = JSON.parse(fs.readFileSync(path.join(RAW_JSON_DATA_PATH, file)));
        if(!data.asAtDate){
            console.error(`Unable to handle ${file}, no as at date`);
            continue;
        }

        if(!byDate[data.asAtDate]){
            byDate[data.asAtDate] = {DATE: data.asAtDate};
        }

        for(const entry of data.entries){
            for(let k in entry){
                if(SUFFIX_MAPPING[k]){
                    const key = `${entry.Jurisdiction.toUpperCase().slice(0, 3)}_${SUFFIX_MAPPING[k]}`;
                    const value = isNumber(entry[k]) ? toNumber(entry[k]) : entry[k];

                    byDate[data.asAtDate][key] = value;
                }
            }
        }
    }

    const stream = format({ headers: true });
    stream.pipe(fs.createWriteStream(DATA_CSV_PATH));

    const byDateArray = Object.values(byDate);

    for(const row of byDateArray){
        stream.write(row);
    }

    stream.end();

    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(byDateArray, null, 4));
}

generateCsv();
