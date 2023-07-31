// DockerHandler.js
const Docker = require("dockerode");
const winston = require("winston");

const docker = new Docker(); // Connect to Docker
const logger = winston.createLogger(); // Initialize logger

module.exports = class DockerHandler {
  constructor() {
    this.minecraftContainer = null;
    this.commandStream = null;
  }
  
  async getMinecraftContainer(containerName) {
    const containers = await docker.listContainers();
    const containerInfo = containers.find(
      (container) => container.Names[0] === `/${containerName}`
    );
    
    if (!containerInfo) {
      logger.error(`No such container: ${containerName}`);
      throw new Error(`No such container: ${containerName}`);
    }
    
    this.minecraftContainer = docker.getContainer(containerInfo.Id);
    logger.info(`Connected to ${containerName} container`);
  }

  attachToContainerForCommands() {
    if (!this.minecraftContainer) {
      logger.error("Minecraft container is not initialized");
      throw new Error("Minecraft container is not initialized");
    }

    this.minecraftContainer.attach(
      { stream: true, stdin: true },
      (err, stream) => {
        if (err) {
          logger.error(err);
          throw err;
        }
  
        this.commandStream = stream;
      }
    );
  }

  sendCommand(command) {
    if (!this.commandStream) {
      logger.error("Command stream is not initialized");
      return;
    }
  
    this.commandStream.write(command + "\n");
  }
};
