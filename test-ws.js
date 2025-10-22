// test-ws.js
import WebSocket from "ws";

const ws = new WebSocket("ws://127.0.0.1:3668/ws?token=TEST");

ws.on("open", () => console.log("Connected"));
ws.on("message", (msg) => console.log("Message:", msg.toString()));
ws.on("close", () => console.log("Disconnected"));
ws.on("error", (err) => console.error("Error:", err));
