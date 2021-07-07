const fs = require('fs');
const path = require('path');
const moment = require('moment');
const lodash = require('lodash');

const RAW_JSON_DATA_PATH = 'docs/data/raw/';
const RAW_JSON_DATA_PATH_NEW = 'docs/data/raw-new/';

const getSaveTableData = async (rawData, graphId, type) => {
        return new Promise((resolve, reject) => {
                let dateStr = moment(rawData.lastModified).format('YYYY-MM-DD');
                let graphObject = rawData.data[graphId];

                let dimensions = graphObject.qHyperCube.qDimensionInfo.map(item => item.qFallbackTitle);
                let measures = graphObject.qHyperCube.qMeasureInfo.map(item => item.qFallbackTitle);
                let header = [...dimensions, ...measures];

                const data = { asAtDate: dateStr, type, entries: [] };
                graphObject.qHyperCube.qDataPages[0].qMatrix.map(row => {
                        row = row.map(datapoint => {
                                if(isNaN(datapoint.qNum)) return datapoint.qText;
                                return datapoint.qNum.toString();
                        });
                        data.entries.push(lodash.zipObject(header, row));
                });

                const rawJsonPath = path.join(RAW_JSON_DATA_PATH, `${dateStr}.${type}.json`);
                fs.writeFileSync(rawJsonPath, JSON.stringify(data, null, 4));

                return data;
        });
}

const generateLegacyData = async () => {
        const files = fs.readdirSync(RAW_JSON_DATA_PATH_NEW).filter(p => p.endsWith(".json"));
        for(const file of files){
                const data = JSON.parse(fs.readFileSync(path.join(RAW_JSON_DATA_PATH_NEW, file)));
                Promise.all([
                        getSaveTableData(data, 'KdmpZ', 'cases'),
                        getSaveTableData(data, 'zfDpnUy', 'tests'),
                        getSaveTableData(data, 'gjjZnj', 'source'),
                        getSaveTableData(data, 'PSWhPA', 'casesage'),
                        getSaveTableData(data, 'uJauhW', 'deathsage'),
                        getSaveTableData(data, 'GJSFMHS', 'caseshospital'),
                        getSaveTableData(data, 'SfYPx', 'agedcareresidential'),
                        getSaveTableData(data, 'aVJJAHx', 'agedcareinhome')
                ]);
        }
}

generateLegacyData();
