const createAxios = require('./helpers');
const getUserAgent = require('./userAgents');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class LinkedInValidator {
  constructor(cookies) {
    if (!cookies) {
      throw new Error('LinkedIn cookies are required for validation');
    }
    
    // Parse cookies if provided as string
    if (typeof cookies === 'string') {
      this.cookies = this.parseCookieString(cookies);
    } else {
      this.cookies = cookies;
    }
    
    this.axios = createAxios(this.cookies);
  }

  parseCookieString(cookieString) {
    const cookies = {};
    cookieString.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        cookies[key] = value;
      }
    });
    return cookies;
  }

  async validateUrl(url) {
    try {
      const minDelay = parseInt(process.env.MIN_DELAY) || 2000;
      const maxDelay = parseInt(process.env.MAX_DELAY) || 6000;
      const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
      
      await delay(randomDelay);

      const response = await this.axios({
        method: 'GET',
        url: url,
        headers: {
          'User-Agent': getUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        validateStatus: function (status) {
          return true;
        }
      });

      const result = {
        url: url,
        httpCode: response.status,
        valid: this.isValidResponse(response),
        redirectUrl: response.request?.res?.responseUrl || url,
        headers: response.headers
      };

      if (this.isLinkedInUrl(url)) {
        result.linkedIn = true;
        result.profileType = this.getProfileType(url);

        if (response.status === 200) {
          result.valid = this.validateLinkedInContent(response.data);
        }
      }

      return result;

    } catch (error) {
      return {
        url: url,
        httpCode: error.response?.status || 0,
        valid: false,
        error: error.message,
        errorType: this.getErrorType(error)
      };
    }
  }

  isValidResponse(response) {
    const status = response.status;
    
    // for now
    if (status >= 200 && status < 400) {
      return true;
    }
    return false;
  }

  isLinkedInUrl(url) {
    return url.includes('linkedin.com');
  }

  getProfileType(url) {
    if (url.includes('/in/')) {
      return 'person';
    } else if (url.includes('/company/')) {
      return 'company';
    } else if (url.includes('/school/')) {
      return 'school';
    } else if (url.includes('/posts/')) {
      return 'post';
    }
    return 'unknown';
  }

// Check for LinkedIn-specific content
  validateLinkedInContent(html) {
    if (html.includes('Page not found') || 
        html.includes('This profile doesn\'t exist') ||
        html.includes('Member not found') ||
        html.includes('authwall')) {
      return false;
    }
    if (html.includes('linkedin.com') && 
        (html.includes('profile') || 
         html.includes('company') || 
         html.includes('experience'))) {
      return true;
    }
    
    return true;
  }

  getErrorType(error) {
    if (error.code === 'ENOTFOUND') {
      return 'DNS_ERROR';
    } else if (error.code === 'ECONNREFUSED') {
      return 'CONNECTION_REFUSED';
    } else if (error.code === 'ETIMEDOUT') {
      return 'TIMEOUT';
    } else if (error.response?.status === 404) {
      return 'NOT_FOUND';
    } else if (error.response?.status === 403) {
      return 'FORBIDDEN';
    } else if (error.response?.status >= 500) {
      return 'SERVER_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  // Batch validate multiple URLs
  async validateUrls(urls, concurrency = 3) {
    const results = [];
    
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => this.validateUrl(url));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            url: batch[index],
            httpCode: 0,
            valid: false,
            error: result.reason.message
          });
        }
      });
      if (i + concurrency < urls.length) {
        const batchDelay = parseInt(process.env.BATCH_DELAY) || 3000;
        const randomBatchDelay = Math.floor(Math.random() * 2000) + batchDelay; // +0-2 seconds
        await delay(randomBatchDelay);
      }
    }
    
    return results;
  }
}
module.exports = LinkedInValidator;
