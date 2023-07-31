// main.js
const fs = require("fs"); // Add this line for file system operations
const axios = require("axios"); // Add this line for making HTTP requests
const { createClient } = require("bedrock-protocol");
const winston = require("winston");
const logger = require("./Logger"); // Assuming Logger.js is in the same directory
const containerServerName = "your server container name"
const server = {
  host: "172.25.0.2",
  port: 19132,
}
const DockerHandler = require("./DockerHandler");
const dockerHandler = new DockerHandler();

const MinecraftClient = require("./MinecraftClient");
const minecraftClient = new MinecraftClient(logger, dockerHandler,server);

dockerHandler
  .getMinecraftContainer(containerServerName)
  .then(() => dockerHandler.attachToContainerForCommands())
  .then(() => minecraftClient.connect())
  .catch((error) => console.error(error));

// Durante il funzionamento del tuo codice, quando vuoi inviare un comando al contenitore Docker,
// puoi usare:
// dockerHandler.sendCommand('il-tuo-comando');
