# Use an official Node runtime as the parent image
FROM node:14

# Set the working directory in the container to /app
WORKDIR /app

# Install git and openssh-client
RUN apt-get update && apt-get install -y git openssh-client

# Copy the .env file and SSH keys to the working directory
COPY .env .ssh/id_rsa /app/

# Define environment variable
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

# Set permissions for the SSH key
RUN chmod 600 /app/.ssh/id_rsa

# Add the SSH key to the SSH agent
RUN eval "$(ssh-agent -s)" && ssh-add /app/.ssh/id_rsa

# Clone the repository
RUN git clone git@github.com:username/repo.git .

# Install any needed packages specified in package.json
RUN npm install

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Run the app when the container launches
CMD ["npm", "start"]