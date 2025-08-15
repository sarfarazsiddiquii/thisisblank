const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class BrowserManager {
    constructor() {
        this.browsers = {};
    }

    async initBrowser(account, headless = false) {
        if (this.browsers[account.name]) {
            return this.browsers[account.name];
        }

        const browser = await puppeteer.launch({
            headless: headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=VizDisplayCompositor',
                '--disable-web-security',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--window-size=1366,768'
            ]
        });

        const page = await browser.newPage();
        
        // Set user agent
        await page.setUserAgent(account.userAgent);
        
        // Set viewport
        await page.setViewport({
            width: 1366 + Math.floor(Math.random() * 200),
            height: 768 + Math.floor(Math.random() * 200)
        });

        // Set LinkedIn session cookie
        await page.setCookie({
            name: 'li_at',
            value: account.sessionCookie,
            domain: '.linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true
        });

        // Navigate to LinkedIn first to ensure cookie is set
        try {
            await page.goto('https://www.linkedin.com/feed', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.log(` Warning: Could not load LinkedIn feed for ${account.name}: ${error.message}`);
        }

        this.browsers[account.name] = { browser, page };
        return this.browsers[account.name];
    }

    async simulateHumanBehavior(page) {
        try {
            // Random scroll down
            const scrollDistance = Math.random() * 800 + 300;
            await page.evaluate((distance) => {
                window.scrollBy(0, distance);
            }, scrollDistance);
            
            await this.randomDelay(1000, 3000);

            // Try to hover over and occasionally click profile elements
            const profileElements = await page.$$('.pv-top-card, .feed-shared-update-v2, .pv-entity__summary-info, .artdeco-button, .feed-shared-social-action-bar__action-button');
            if (profileElements.length > 0) {
                const randomElement = profileElements[Math.floor(Math.random() * Math.min(profileElements.length, 3))];
                await randomElement.hover();
                await this.randomDelay(500, 1200);
                
                // 30% chance to click the element
                if (Math.random() < 0.3) {
                    try {
                        await randomElement.click();
                        await this.randomDelay(800, 2000);
                        
                        if (Math.random() < 0.5) {
                            await page.goBack();
                            await this.randomDelay(1000, 2500);
                        }
                    } catch (clickError) {
                    }
                }
            }

            // Random small scroll
            await page.evaluate(() => {
                window.scrollBy(0, Math.random() * 300 - 150);
            });
            
            await this.randomDelay(1000, 2500);
        } catch (error) {
            console.error(` Error: ${error.message}`);
        }
    }

    async randomDelay(min = 1000, max = 5000) {
        const delay = Math.random() * (max - min) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    async cleanup() {
        console.log(' Cleaning up browsers...');
        for (const accountName in this.browsers) {
            try {
                const { browser } = this.browsers[accountName];
                if (browser && browser.isConnected()) {
                    await browser.close();
                }
            } catch (error) {
                console.error(` Error: ${error.message}`);
            }
        }
        this.browsers = {};
    }
}

module.exports = BrowserManager;
