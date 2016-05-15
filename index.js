#!/usr/bin/env node
"use strict";

const WebSocketServer = require("websocket").server;
const http = require("http");
const net = require("net");
const port = 6667;
const separator = "\r\n";

function log() {
    console.log(Date.now(), ...arguments);
}

var server = http.createServer((request, response) => {
    response.writeHead(404);
    response.end();
});

server.listen(port, () => {
    log(`ws <-> irc server is listening on :${port}`);
});

let wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

wsServer.on("request", request => {
    let s = request.resourceURL.query.server || "";
    let r = s.match(/^([^:]+)(:([0-9]+))?$/);
    if (!r) { return request.reject(); }

    let server = r[1];
    let port = Number(r[3]) || 6667;
    let connection = request.accept(null, request.origin);
    log(`[ws] connection accepted, connecting to ${server}:${port}`);

    let socket = new net.Socket();
	socket.setTimeout(0);
	socket.setEncoding("utf-8");
    socket.connect(port, server);

    let buffer = "";

    connection.on("message", message => {
        log("ws -> irc", message.utf8Data);
        socket.write(message.utf8Data + separator);
    });

    connection.on("close", (reasonCode, description) => {
        log(`[ws] ${connection.remoteAddress} disconnected`);
        socket.end();
    });

    socket.addListener("data", data => {
        buffer += data;
        while (1) {
            let index = buffer.indexOf(separator);
            if (index == -1) { break; }
            let message = buffer.substring(0, index);
            log("irc -> ws", message);
            connection.send(message);
            buffer = buffer.substring(index + separator.length);
        }
	});

    socket.addListener("close", () => {
        log("[irc] disconnected");
        connection.close();
	});
});
