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
    
    if (Array.isArray(cookies)) {
      this.accounts = cookies.map((cookieStr, index) => ({
        id: `account_${index + 1}`,
        cookies: typeof cookieStr === 'string' ? this.parseCookieString(cookieStr) : cookieStr,
        requestCount: 0,
        lastRequestTime: 0
      }));
    } else {
      const parsedCookies = typeof cookies === 'string' ? this.parseCookieString(cookies) : cookies;
      this.accounts = [{
        id: 'account_1',
        cookies: parsedCookies,
        requestCount: 0,
        lastRequestTime: 0
      }];
    }
    
  this.currentAccountIndex = 0;
  this.maxRequestsPerAccount = parseInt(process.env.MAX_REQUESTS_PER_ACCOUNT, 10) || 3;
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
  // Find account with available requests
  getNextAccount() {
    for (let i = 0; i < this.accounts.length; i++) {
      const account = this.accounts[this.currentAccountIndex];
      
      if (account.requestCount < this.maxRequestsPerAccount) {
        return account;
      }
      this.currentAccountIndex = (this.currentAccountIndex + 1) % this.accounts.length;
    }
    this.accounts.forEach(account => {
      account.requestCount = 0;
    });
    
    return this.accounts[0];
  }

  async validateUrlWithAccount(account, url) {
    try {
      const axios = createAxios(account.cookies);
      const minDelay = parseInt(process.env.MIN_DELAY) || 2000;
      const maxDelay = parseInt(process.env.MAX_DELAY) || 6000;
      const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

      const timeSinceLastRequest = Date.now() - (account.lastRequestTime || 0);
      if (timeSinceLastRequest < 3000) {
        await delay(3000 - timeSinceLastRequest);
      }

      await delay(randomDelay);

      const response = await axios({
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
        headers: response.headers,
        accountUsed: account.id
      };

      if (this.isLinkedInUrl(url)) {
        result.linkedIn = true;
        result.profileType = this.getProfileType(url);

        if (response.status === 200) {
          result.valid = this.validateLinkedInContent(response.data);
        }
      }

      account.requestCount = (account.requestCount || 0) + 1;
      account.lastRequestTime = Date.now();

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

  // Backwards-compatible single-url method that auto-chooses the next account
  async validateUrl(url) {
    const account = this.getNextAccount();
    return this.validateUrlWithAccount(account, url);
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
  async validateUrls(urls) {
    const results = [];
    const perAccountLimit = this.maxRequestsPerAccount;

    for (let a = 0; a < this.accounts.length; a++) {
      const account = this.accounts[a];
      if (urls.length === 0) break;
      const batch = urls.splice(0, perAccountLimit);

      const promises = batch.map(url => this.validateUrlWithAccount(account, url));
      const settled = await Promise.allSettled(promises);

      settled.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          results.push(res.value);
        } else {
          results.push({
            url: batch[idx],
            httpCode: 0,
            valid: false,
            error: res.reason?.message || String(res.reason)
          });
        }
      });

      // small delay between account switches
      if (a + 1 < this.accounts.length && urls.length > 0) {
        const batchDelay = parseInt(process.env.BATCH_DELAY) || 3000;
        const randomBatchDelay = Math.floor(Math.random() * 2000) + batchDelay;
        await delay(randomBatchDelay);
      }
    }
    return results;
  }
}
module.exports = LinkedInValidator;
