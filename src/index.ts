import dgram from "node:dgram";
import { WebSocketServer, WebSocket } from "ws";
import { EventModel, HeaderModel, TrailerModel } from "./model/eventModel";
import { ResultModel } from "./model/resultModel";
import { ClockModel } from "./model/clockModel";

// Get an env var, exit with message if not present
function getRequiredEnvVar(envVar: string): number {
    const port = process.env[envVar];
    if (!port) {
        console.error(`Error: ${envVar} environment variable is required`);
        process.exit(1);
    }
    return parseInt(port);
}

// Port for incoming Lynx body messages
const UDP_BODY_PORT = getRequiredEnvVar("LYNX_BODY_PORT");
// Port for body websocket
const WS_BODY_PORT = getRequiredEnvVar("WS_BODY_PORT");
// Port for incoming Lynx clock messages
const UDP_CLOCK_PORT = getRequiredEnvVar("LYNX_CLOCK_PORT");
// Port for clock websocket
const WS_CLOCK_PORT = getRequiredEnvVar("WS_CLOCK_PORT");

console.log(`Lynx Body Listen: ${UDP_BODY_PORT}`);
console.log(`Lynx Clock Listen: ${UDP_CLOCK_PORT}`);
console.log(`WS Body Port:  ${WS_BODY_PORT}`);
console.log(`WS Clock Port:  ${WS_CLOCK_PORT}`);

let lastBody: EventModel;
let lastClock: ClockModel;

/**
 * Parse a body buffer from Lynx, returning an EventModel
 * @param msg A complete body buffer from Lynx
 * @returns populated EventModel from the buffer
 */
function parseMessage(msg: Buffer): EventModel {
    console.log(msg.toString('ascii'));
    let i = 0;
    let res: EventModel = new EventModel();

    // parse event data
    res.title = msg.subarray(i, i = msg.indexOf(44)).toString('ascii'); // 44 is ','
    res.wind = msg.subarray(++i, i = msg.indexOf(44, i)).toString('ascii');
    res.heat = msg.subarray(++i, i = msg.indexOf(44, i)).toString('ascii');
    res.dist = msg.subarray(++i, i = msg.indexOf(59, i)).toString('ascii'); // 59 is ';'

    while (i < msg.length) {
        const tmp = ResultModel.fromLynxBuffer(msg.subarray(++i, i = msg.indexOf(59, i)));
        if (i < 0) {
            break;
        }
        res.results.push(tmp);
    }

    res.trailer = new TrailerModel(res.heat, res.wind, res.dist);
    res.header = new HeaderModel(res.title);
    return res;
}

// --- Create Body UDP socket ---
const udpBody = dgram.createSocket("udp4");

udpBody.on("error", (err) => {
    console.error("UDP error:", err);
    udpBody.close();
});

let rxMessageBuffer: Buffer<ArrayBuffer>;

udpBody.on("message", (msg, rinfo) => {
    console.log(msg);
    console.log(msg.toString('ascii'));
    try {
        if (msg.at(0) === 0xb2 && msg.at(1) === 0xb2) { // header preamble
            console.log("HAS START");
            rxMessageBuffer = msg;
            // cut the first 2 bytes
            rxMessageBuffer = rxMessageBuffer.subarray(2);
        }
        else {
            // append msg to rxMessageBuffer
            rxMessageBuffer = Buffer.concat([rxMessageBuffer, msg]);
        }
        if (msg.at(-1) === 0xc4 && msg.at(-1) === 0xc4) { // trailer preamble
            // cut the last two bytes
            rxMessageBuffer = rxMessageBuffer.subarray(0, rxMessageBuffer.length - 2);
            console.log("HAS END");

            const parsed = parseMessage(rxMessageBuffer);
            console.log('Parsed message:', parsed);

            lastBody = parsed;

            // Broadcast incoming UDP packet to all connected WebSocket clients
            for (const client of wssBody.clients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(parsed)); // send as binary
                }
            }
        }
    }
    catch (e) {
        console.error(`Failed to parse body message`);
        console.error(e);
    }

});

udpBody.bind(UDP_BODY_PORT);

// --- Create Clock UDP socket ---
const udpClock = dgram.createSocket("udp4");

udpClock.on("error", (err) => {
    console.error("UDP error:", err);
    udpClock.close();
});

udpClock.on("message", (msg, rinfo) => {
    try {
        if (msg.at(0) == 0xd2) {
            return; // don't update for time of day
        }

        const parsed = new ClockModel(msg.toString('ascii').trim());

        lastClock = parsed;

        // Broadcast incoming UDP packet to all connected WebSocket clients
        for (const client of wssClock.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsed)); // send as binary
            }
        }
    }
    catch (e) {
        console.error(`Failed to parse clock message`);
        console.error(e);
    }
});

udpClock.bind(UDP_CLOCK_PORT);

// --- WebSocket Body Server ---
const wssBody = new WebSocketServer({ port: WS_BODY_PORT });

wssBody.on("connection", (ws, req) => {
    console.log(`Body client connected: ${req.socket.remoteAddress}`);
    if (lastBody != undefined) {
        ws.send(JSON.stringify(lastBody));
    }

    ws.on("close", () => {
        console.log("Body client disconnected");
    });
});

// --- WebSocket Clock Server ---
const wssClock = new WebSocketServer({ port: WS_CLOCK_PORT });

wssClock.on("connection", (ws, req) => {
    console.log(`Clock client connected: ${req.socket.remoteAddress}`);
    if (lastClock != undefined) {
        ws.send(JSON.stringify(lastClock));
    }

    ws.on("close", () => {
        console.log("Clock client disconnected");
    });
});

console.log("Proxy running.");
