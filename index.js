#!/usr/bin/env node
"use strict";

const WebSocketServer = require("websocket").server;
const http = require("http");
const net = require("net");
const port = 6667;

function log() {
    console.log(Date.now(), ...arguments);
}

var server = http.createServer((request, response) => {
    response.writeHead(404);
    response.end();
});

server.listen(port, () => {
    log(`Server is listening on :${port}`);
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

    connection.on("message", message => {
        log("ws -> irc", message.utf8Data);
        socket.write(message.utf8Data + "\r\n");
    });

    connection.on("close", (reasonCode, description) => {
        log(`[ws] ${connection.remoteAddress} disconnected`);
        socket.end();
    });

    socket.addListener("data", data => {
        data = data.split("\r\n");
        data.forEach(message => {
            if (!message) { return; }
            log("irc -> ws", message);
    		connection.send(message);
        });
	});

    socket.addListener("close", () => {
        log("[irc] disconnected");
        connection.close();
	});
});