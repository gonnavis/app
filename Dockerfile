FROM node	
ENV LAST_UPDATED 20160605T165400	
LABEL description="webaverse-app"
	
# Copy source code
COPY . /app
	

# Change working directory
WORKDIR /app
	

# Install dependencies
RUN apt update -y
RUN apt install sudo -y
RUN npm install forever -g
RUN npm install
RUN npm list
	

# Expose API port to the outside
EXPOSE 5000
EXPOSE 5001
	

	# Launch application
CMD forever -a -l /host/forever.log -o stdout.log -e stderr.log index.js
