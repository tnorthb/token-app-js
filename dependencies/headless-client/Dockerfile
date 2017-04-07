FROM openjdk:8
COPY . /usr/src/headless-client
WORKDIR /usr/src/headless-client
CMD ["flyway", "baseline"]
CMD ["java", "-jar", "token-headless-client.jar", "config.yml"]