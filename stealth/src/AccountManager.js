require('dotenv').config();

class AccountManager {
    constructor() {
        this.accounts = this.loadAccounts();
        this.requestCounts = {};
        this.maxRequestsPerHour = 5;
        
        // Initialize request tracking
        this.accounts.forEach(account => {
            this.requestCounts[account.name] = {
                count: 0,
                resetTime: Date.now() + 3600000 // 1 hour from now
            };
        });
    }

    loadAccounts() {
        const accounts = [];
        
        // Load cookies from .env (LINKEDIN_COOKIE1, LINKEDIN_COOKIE2, etc.)
        for (let i = 1; i <= 4; i++) {
            const cookieKey = `LINKEDIN_COOKIE${i}`;
            const cookie = process.env[cookieKey];
            
            if (cookie) {
                accounts.push({
                    name: `account_${i}`,
                    sessionCookie: cookie,
                    userAgent: this.getRandomUserAgent()
                });
            }
        }
        
        if (accounts.length === 0) {
            throw new Error('No LinkedIn session cookies found in .env file. Please add LINKEDIN_COOKIE1, LINKEDIN_COOKIE2, etc.');
        }
        
        console.log(`✅ Loaded ${accounts.length} LinkedIn accounts`);
        return accounts;
    }

    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    getAvailableAccount() {
        const now = Date.now();
        
        // Reset counters if an hour has passed
        for (const accountName in this.requestCounts) {
            if (now > this.requestCounts[accountName].resetTime) {
                this.requestCounts[accountName] = {
                    count: 0,
                    resetTime: now + 3600000
                };
                console.log(` Reset hourly counter for ${accountName}`);
            }
        }

        // Find accounts with available requests (2-5 random requests per account)
        const availableAccounts = this.accounts.filter(account => {
            const requests = this.requestCounts[account.name].count;
            const randomLimit = Math.floor(Math.random() * 4) + 2; // 2-5 requests
            return requests < randomLimit;
        });

        if (availableAccounts.length === 0) {
            console.log(`⏳ All accounts reached their random limit (2-5 requests). Next reset in ${Math.ceil((Math.min(...Object.values(this.requestCounts).map(r => r.resetTime)) - now) / 60000)} minutes`);
            return null;
        }

        // Return random available account
        const selectedAccount = availableAccounts[Math.floor(Math.random() * availableAccounts.length)];
        return selectedAccount;
    }

    incrementRequestCount(accountName) {
        this.requestCounts[accountName].count++;
    }

    getAllAccounts() {
        return this.accounts;
    }
}

module.exports = AccountManager;
