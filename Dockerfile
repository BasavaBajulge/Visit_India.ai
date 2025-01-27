# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to install dependencies separately
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose port 3000 to the host
EXPOSE 3000

# Define environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
