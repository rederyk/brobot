///MinecraftClient.js

const { createClient } = require("bedrock-protocol");
const winston = require("winston");
const createPrompt = require("./prompt.js");
const axios = require("axios"); // Importa il modulo axios
const fs = require("fs").promises; // Importa il modulo fs con il supporto per le promesse
const path = require("path"); // Importa il modulo path
const logger = require("./Logger"); // Importa il modulo Logger.js

const OPENAI_API_KEY = "your-openai-key";

module.exports = class MinecraftClient {
  constructor(logger, dockerHandler,server) {
    this.client = null;
    this.gameStartPacket = null;
    this.bot = {};
    this.activeUsers = {};
    this.logger = logger;
    this.dockerHandler = dockerHandler;
    this.createPrompt = createPrompt;
    this.server = server;
  }

  connect() {
    if (this.client) {
      return;
    }

    this.client = createClient({
      host: this.server.host,
      port: this.server.port,
      offline: false,
    });

    this.client.on("text", this.handleText.bind(this));
    this.client.on("error", this.logger.error);

    this.client.on("start_game", (packet) => {
      this.gameStartPacket = packet;
      this.bot.position = this.gameStartPacket.player_position;
    });
  }

  handleText(packet) {
    if (packet.source_name === this.client.username) {
      return;
    }

    if (packet.type === "chat") {
      const message = packet.message;
      const lowerMessage = message.toLowerCase();
      const user = {
        name: packet.source_name,
        position: {
          x: this.bot.position.x,
          y: this.bot.position.y,
          z: this.bot.position.z,
        },
      };

      if (lowerMessage === "heybot" || lowerMessage === "hey bot") {
        this.handleHeyBot(user);
      } else if (lowerMessage === "zittobot") {
        this.handleZittoBot(user);
      } else if (lowerMessage === "offbot") {
        this.handleOffBot();
      } else if (lowerMessage.startsWith("cmd ")) {
        this.handleCmd(message);
      } else {
        if (this.activeUsers[user.name]) {
          try {
            this.handleSuperBot(this.bot, user, packet);
          } catch (error) {
            this.logger.error(error);
          }
        }
      }
    }
  }

  sendMessage(message) {
    this.client.queue("text", {
      type: "chat",
      needs_translation: false,
      source_name: this.client.username,
      message,
      xuid: "",
      platform_chat_id: "",
    });
  }

  handleCmd(message) {
    const command = message.substring(4);
    this.dockerHandler.sendCommand(command);
  }

  handleOffBot() {
    this.activeUsers = {}; // This disconnects all users from the bot
    this.sendMessage("Ok vai a dormire te, che io non sono in grado");

    // Disconnect the client
    this.client.close();
    this.client = null; // Ensure the old client is garbage collected

    // Reconnect after 1 minute
    setTimeout(() => this.connect(), 1 * 60 * 1000);
  }

  handleZittoBot(user) {
    this.activeUsers[user.name] = false;
  }

  handleHeyBot(user) {
    this.activeUsers[user.name] = true;
    const defaultResponse =
      "Yoo sono il bot ti ascolto, offbot mi disconnetto, zittobot mi spengo,";
    this.sendMessage(defaultResponse);
  }

  async handleSuperBot(bot, user, packet) {
    let previousConversation;

    try {
      previousConversation = JSON.parse(
        readFileSync(path.join("log", `${user.name}.json`))
      );
    } catch (error) {
      previousConversation = [];
    }

    previousConversation.push({
      role: "user",
      content: packet.message,
      name: user.name,
    });
    const prompt = createPrompt(this.client, user, bot);
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo-16k",
        messages: [
          {
            role: "system",
            content: prompt,
          },
          ...previousConversation,
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    let aiResponse = response.data.choices[0].message.content.trim();
    let respJson;

    // Try to parse AI response as JSON
    try {
      let jsonStart = aiResponse.indexOf("{");
      let jsonEnd = aiResponse.lastIndexOf("}") + 1;
      let jsonStr = aiResponse.slice(jsonStart, jsonEnd);
      respJson = JSON.parse(jsonStr);
    } catch (error) {
      logger.error("Invalid JSON in AI response:", error);
      logger.info(aiResponse);
      return;
    }

    if (respJson && respJson.risposta.message) {
      const messages =
        respJson.risposta.message.match(/(.|[\r\n]){1,250}(?=\s|$)/g) || [];

      for (const message of messages) {
        this.client.queue("text", {
          type: "chat",
          needs_translation: false,
          source_name: this.client.username,
          message,
          xuid: "",
          platform_chat_id: "",
        });

        const chatLog = {
          role: "assistant",
          content: message,
          name: this.client.username,
          commands: respJson.risposta.commands,
        };

        previousConversation.push(chatLog);
      }
    } else {
      logger.error("Invalid response from AI:", respJson.risposta);
      logger.info(respJson.risposta);
    }

    try {
      // Usa la funzione appendToFile dal Logger per salvare i dati delle conversazioni
      await logger.appendToFile(
        path.join("log", `${user.name}.json`),
        previousConversation
      );
    } catch (error) {
      logger.error("Error appending conversation to file:", error); // Utilizza Logger.error per scrivere il messaggio di errore
    }
    // Execute each command
    if (respJson.risposta.commands) {
      for (const command of respJson.risposta.commands) {
        this.dockerHandler.sendCommand(command);
        logger.info("comandoDelBot_" + command + "\n");
      }
    }
  }
};
