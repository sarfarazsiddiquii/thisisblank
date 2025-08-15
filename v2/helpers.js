const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');


function createAxios(cookies = {}) {
  const jar = new CookieJar();
  
  // Convert cookies object to cookie string and add to jar
  Object.keys(cookies).forEach(key => {
    const cookieString = `${key}=${cookies[key]}; Domain=.linkedin.com; Path=/`;
    jar.setCookieSync(cookieString, 'https://www.linkedin.com');
  });

  const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 30000, 
    maxRedirects: 5
  }));
  
  return client;
}

module.exports = createAxios;
