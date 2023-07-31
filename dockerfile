# Usa un'immagine di base contenente Node.js
FROM node:lts-bullseye

# Installa GCC, G++, e CMake
RUN apt-get update && apt-get install -y gcc g++ cmake

# Crea una directory per l'app all'interno del container
WORKDIR /usr/src/app

# Copia il file package.json e package-lock.json nella directory del container
COPY package*.json ./

# Installa le dipendenze dell'app all'interno del container
RUN npm install

# Copia tutti i file dell'app nella directory del container
COPY . .

# Esponi la porta sulla quale l'app ascolta (assicurati che il tuo progetto Node.js utilizzi la stessa porta)
#EXPOSE 3000

# Comando da eseguire per avviare l'app all'interno del container
CMD ["node", "js/main.js"]

