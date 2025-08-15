const AccountManager = require('./AccountManager');
const BrowserManager = require('./BrowserManager');
const ProfileValidator = require('./ProfileValidator');
const DataManager = require('./DataManager');

class LinkedInValidator {
    constructor() {
        this.accountManager = new AccountManager();
        this.browserManager = new BrowserManager();
        this.profileValidator = new ProfileValidator();
        this.dataManager = new DataManager();
        this.processedUrls = new Set();
        this.results = [];
    }

    async processUrls(inputCsvPath, outputCsvPath, startRow = 1, maxUrls = null) {
        try {
            const urls = await this.dataManager.loadUrlsFromCsv(inputCsvPath);
            
            // Filter URLs based on startRow and maxUrls
            const urlsToProcess = maxUrls ? 
                urls.slice(startRow - 1, startRow - 1 + maxUrls) : 
                urls.slice(startRow - 1);
                
            console.log(`🎯 Processing ${urlsToProcess.length} URLs starting from row ${startRow}`);
            
            let processedCount = 0;

            for (const { expertId, linkedinUrl } of urlsToProcess) {
                // Skip if already processed
                if (this.processedUrls.has(linkedinUrl)) {
                    console.log(`⏭️  Skipping already processed URL: ${linkedinUrl}`);
                    continue;
                }

                console.log(`\n📝 [${processedCount + 1}/${urlsToProcess.length}] Expert ID: ${expertId}`);
                
                // Try with all accounts until one succeeds or all fail
                let result = null;
                let triedAccounts = [];
                
                for (let attemptCount = 0; attemptCount < this.accountManager.getAllAccounts().length; attemptCount++) {
                    // Get an available account that hasn't been tried yet
                    let account = this.accountManager.getAvailableAccount();
                    
                    // If no available account or already tried this one, try a different one
                    if (!account || triedAccounts.includes(account.name)) {
                        // Find an untried account
                        const untriedAccounts = this.accountManager.getAllAccounts().filter(acc => 
                            !triedAccounts.includes(acc.name)
                        );
                        
                        if (untriedAccounts.length === 0) {
                            console.log(`⚠️  All accounts tried for this URL. Moving to next.`);
                            break;
                        }
                        
                        account = untriedAccounts[0];
                        console.log(`🔄 Trying different account: ${account.name}`);
                    }

                    triedAccounts.push(account.name);
                    
                    // Validate URL with this account
                    result = await this.profileValidator.validateUrl(
                        expertId, 
                        linkedinUrl, 
                        account, 
                        this.browserManager
                    );
                    
                    // If successful, break and move to next URL
                    if (result.status === 'valid' || (result.status === 'invalid' && !result.error.includes('Too many redirects'))) {
                        break;
                    }
                    
                    // If it's a redirect/auth error, try next account
                    if (result.error && (result.error.includes('Too many redirects') || result.error.includes('authentication'))) {
                        continue;
                    }
                    
                    // For other errors, also try next account
                }
                
                // If no result after trying all accounts, mark as error
                if (!result) {
                    result = {
                        expertId,
                        linkedinUrl,
                        status: 'error',
                        error: 'All accounts failed - likely authentication issues',
                        statusCode: null,
                        timestamp: new Date().toISOString(),
                        accountUsed: 'none'
                    };
                }
                
                // Increment request count for the account used
                if (result.accountUsed !== 'none') {
                    this.accountManager.incrementRequestCount(result.accountUsed);
                }
                
                this.results.push(result);
                this.processedUrls.add(linkedinUrl);
                processedCount++;

                // Save results periodically (every 5 URLs)
                if (processedCount % 5 === 0) {
                    await this.dataManager.saveResults(this.results, outputCsvPath);
                    console.log(`💾 Batch saved: ${processedCount} URLs processed`);
                }
            }

            // Save final results
            await this.dataManager.saveResults(this.results, outputCsvPath);
            
            const summary = this.profileValidator.getResultSummary(this.results);
            console.log(`\n🎉 PROCESSING COMPLETE!`);
            console.log(`📊 Total processed: ${processedCount}`);
            console.log(`✅ Valid profiles: ${summary.valid}`);
            console.log(`❌ Invalid profiles: ${summary.invalid}`);
            console.log(`⚠️  Errors: ${summary.errors}`);
            console.log(`💾 Results saved to: ${outputCsvPath}`);

        } catch (error) {
            console.error('💥 Error processing URLs:', error);
        } finally {
            await this.browserManager.cleanup();
        }
    }
}

module.exports = LinkedInValidator;
