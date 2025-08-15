const userAgents = require('./userAgents.json');

function getUserAgent() {
  const index = Math.floor(Math.random() * userAgents.length);
  return userAgents[index];
}

module.exports = getUserAgent;
