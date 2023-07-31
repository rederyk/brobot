//Logger.js

const winston = require("winston");
const fs = require("fs").promises; // Importa il modulo fs con il supporto per le promesse

// La funzione appendToFile
async function appendToFile(filePath, data) {
  let previousData = [];

  try {
    await fs.access(filePath, fs.constants.F_OK);
    const fileContent = await fs.readFile(filePath, "utf-8");
    previousData = JSON.parse(fileContent);
  } catch (err) {
    // Il file non esiste, iniziamo con un array vuoto
    console.info(`File ${filePath} does not exist, creating new one.`);
  }

  previousData.push(data);
  await fs.writeFile(filePath, JSON.stringify(previousData, null, 2));
}

// Configurazione del logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  //defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

logger.add(
  new winston.transports.Console({
    format: winston.format.simple(),
  })
);

// Aggiungi la funzione appendToFile al logger per renderla disponibile all'esterno
logger.appendToFile = appendToFile;

module.exports = logger;
