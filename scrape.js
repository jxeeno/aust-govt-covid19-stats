const WebSocket = require('ws');
const fetch = require('node-fetch');
const moment = require('moment')
const fs = require('fs');
const path = require('path');
const lodash = require('lodash');

const DATA_RAW_JSON_PATH = 'docs/data/raw-new/';
const DATA_RAW_HTML_PATH = 'docs/data/rawhtml-new/';
const PAGE_URI = 'https://www.health.gov.au/news/health-alerts/novel-coronavirus-2019-ncov-health-alert/coronavirus-covid-19-current-situation-and-case-numbers';
const QLIK_WS_PREFIX = 'wss://covid19-data.health.gov.au/app';

let DOC_ID;
let RAW_HTML;
let LAST_MODIFIED;
let GRAPH_IDS = [];
let GRAPHS;
let DOC_HANDLER_ID = -1;
let WS_CONNECTION;
let REQUEST_INDEX = 0;

const getDocId = async () => {
        return new Promise((resolve, reject) => {
                const referer = encodeURIComponent(PAGE_URI);
                const ws = new WebSocket(`${QLIK_WS_PREFIX}/engineData?reloadUri=${referer}`);

                ws.on("message", data => {
                        data = JSON.parse(data);
                        // wait until the connection is established, then get the list of documents
                        if(data.method && data.method === "OnConnected"){
                                ws.send(JSON.stringify({
                                        delta: true,
                                        method: "GetDocList",
                                        handle: -1, // at this point the handle is -1 as we are operating in global scope
                                        params: [],
                                        id: 1, // we don't need to increase the request index as this connection is only necessary to get the doc metadata
                                        jsonrpc: "2.0"
                                }));
                        }
                        if(data.result){
                                // get the first (and only) doc, and its id
                                let dataDocument = data.result.qDocList[0].value[0];
                                // close the websocket, then return the document
                                ws.terminate();
                                resolve(dataDocument);
                        }
                });
        });
}

const getGraphIdsAndPageContents = async () => {
        return new Promise((resolve, reject) => {
                fetch(PAGE_URI).then(response => response.text()).then(html => {
                        // extract the graphIds from the page
                        let graphIdRegex = /{"qlik_components":(\[({"component_id":"\w{1,10}"},?)*\])/;
                        let match = graphIdRegex.exec(html);
                        let graphIds = match[1];

                        // parse the match to json, and filter out unneeded data
                        graphIds = JSON.parse(graphIds);
                        graphIds = graphIds.map(item => item["component_id"]);
                        resolve([graphIds, html]);
                });
        });
}

const getWsConnectionByDocId = async (docId) => {
        // create a websocket connection for the docId
        return new Promise((resolve, reject) => {
                const referer = encodeURIComponent(PAGE_URI);
                const ws = new WebSocket(`${QLIK_WS_PREFIX}/${docId}?reloadUri=${referer}`);
                ws.on("open", () => {
                        resolve(ws);
                });
        });
}

const openDocById = async (docId, ws) => {
        return new Promise((resolve, reject) => {
                ws.on("message", data => {
                        data = JSON.parse(data);
                        if(data.result && data.result.qReturn){
                                // return the id of this response, as it allows
                                // us to query this document later
                                resolve(data.id);
                        }
                });
                ws.send(JSON.stringify({
                        delta: true,
                        method: "OpenDoc",
                        handle: -1, // still operating in global scope
                        params: [docId],
                        id: (REQUEST_INDEX++, REQUEST_INDEX),
                        jsonrpc: "2.0"
                }));
        });
}

const getGraphHandles = async (docHandlerId, graphIds, ws) => {
        return new Promise((resolve, reject) => {
                let graphsWithHandleIds = [];

                // remove old event listeners
                ws.removeAllListeners("message");
                ws.removeAllListeners("open");
                ws.on("message", data => {
                        data = JSON.parse(data);
                        if(data.result && data.result.qReturn){
                                let graph = {};
                                graph.handleId = data.id;
                                graph.id = data.result.qReturn[0].value.qGenericId;
                                graph.type = data.result.qReturn[0].value.qGenericType;
                                graphsWithHandleIds.push(graph);
                                // resolve once all of the responses have been received
                                if(graphsWithHandleIds.length === graphIds.length){
                                        resolve(graphsWithHandleIds);
                                }
                        }
                });
                // request info for each of the graphs on the page,
                // using the handle we created earlier
                for(graphId of graphIds){
                        ws.send(JSON.stringify({
                                delta: true,
                                method: "GetObject",
                                handle: docHandlerId,
                                params: [graphId],
                                jsonrpc: "2.0",
                                id: (REQUEST_INDEX++, REQUEST_INDEX)
                        }));
                }
        });
}

const getRawData = async (graphs, ws) => {
        return new Promise((resolve, reject) => {
                let rawData = [];

                // remove old event listeners
                ws.removeAllListeners("message")
                ws.removeAllListeners("open");
                ws.on("message", data => {
                        data = JSON.parse(data);
                        let graphObject = data.result.qLayout[0].value;
                        rawData.push(graphObject);
                        if(rawData.length === graphs.length){
                                // sort the data by title as the received order is arbitrary
                                rawData = lodash.sortBy(rawData, 'title');

                                ws.terminate();
                                resolve(rawData);
                        }
                });
                // request info for each of the graphs on the page,
                // using the handle we created earlier
                for (graph of graphs) {
                        ws.send(JSON.stringify({
                                delta: true,
                                method: "GetLayout",
                                handle: graph.handleId,
                                params: [],
                                jsonrpc: "2.0",
                                id: (REQUEST_INDEX++, REQUEST_INDEX)
                        }));
                }
        });
}

// get the document id, and get graphIds
Promise.all([getDocId(), getGraphIdsAndPageContents()]).then(results => {
        let dataDocument = results[0];
        DOC_ID = dataDocument.qDocId;
        LAST_MODIFIED = dataDocument.qMeta.modifiedDate;
        GRAPH_IDS = results[1][0];
        RAW_HTML = results[1][1];
})
// create a websocket connection for the selected document
.then(() => getWsConnectionByDocId(DOC_ID))
.then(ws => {
        WS_CONNECTION = ws;
})
// "open" the document and get a handler id,
// which allows us to query this document later on
.then(() => openDocById(DOC_ID, WS_CONNECTION))
.then(handlerId => {
        DOC_HANDLER_ID = handlerId;
})
.then(() => getGraphHandles(DOC_HANDLER_ID, GRAPH_IDS, WS_CONNECTION))
.then(graphsWithHandleIds => {
        GRAPHS = graphsWithHandleIds;
})
.then(() => getRawData(GRAPHS, WS_CONNECTION))
.then(rawData => {
        // stringify the data so we can write it to a file
        rawData = JSON.stringify(rawData);

        let formattedDate = moment(LAST_MODIFIED).format('YYYY-MM-DD');

        const rawDataPath = path.join(DATA_RAW_JSON_PATH, `${formattedDate}.json`);
        const rawHTMLPath = path.join(DATA_RAW_HTML_PATH, `${formattedDate}.html`);

        if(!fs.existsSync(rawHTMLPath)){
            fs.writeFileSync(rawHTMLPath, RAW_HTML);
        }
        if(!fs.existsSync(rawDataPath)){
            fs.writeFileSync(rawDataPath, rawData);
        }
});
