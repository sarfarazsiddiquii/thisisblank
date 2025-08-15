class ProfileValidator {
    async validateUrl(expertId, linkedinUrl, account, browserManager) {
        let result = {
            expertId,
            linkedinUrl,
            status: 'invalid',
            statusCode: null,
            error: null,
            timestamp: new Date().toISOString(),
            accountUsed: account.name
        };

        try {
            const { page } = await browserManager.initBrowser(account);
            
            // Navigate to LinkedIn URL
            const response = await page.goto(linkedinUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 45000
            });

            result.statusCode = response.status();

            // Check if page loaded successfully
            if (response.status() === 200) {
                // Wait for page to load
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Check for LinkedIn profile indicators and 404 errors
                const pageAnalysis = await page.evaluate(() => {
                    const bodyText = document.body.textContent.toLowerCase();
                    const pageTitle = document.title.toLowerCase();
                    
                    // Check for explicit 404 or error indicators
                    const errorIndicators = [
                        'this linkedin profile was not found',
                        'page not found',
                        'member not found',
                        'profile doesn\'t exist',
                        'user not found',
                        'profile unavailable'
                    ];
                    
                    // Only flag as error if we find explicit error messages
                    const hasError = errorIndicators.some(indicator => 
                        bodyText.includes(indicator)
                    ) || pageTitle.includes('not found') || pageTitle.includes('404');
                    
                    // Check for profile-specific elements
                    const profileSelectors = [
                        '.pv-top-card',
                        '.pv-text-details__left-panel', 
                        '.ph5.pb5',
                        '.pv-entity__summary-info',
                        '[data-section="summary"]',
                        '.profile-photo-edit',
                        '.pv-top-card-profile-picture',
                        '.pv-contact-info',
                        'h1[data-anonymize="person-name"]',
                        '.text-body-medium.break-words'
                    ];
                    
                    const hasProfileElements = profileSelectors.some(selector => 
                        document.querySelector(selector) !== null
                    );
                    
                    // Check for valid LinkedIn profile indicators in title/content
                    const hasValidProfileContent = 
                        pageTitle.includes('| linkedin') ||
                        pageTitle.includes('- linkedin') ||
                        bodyText.includes('experience') ||
                        bodyText.includes('education') ||
                        bodyText.includes('skills') ||
                        bodyText.includes('connections');
                    
                    // Check for general LinkedIn page structure
                    const hasLinkedInStructure = document.querySelector('.linkedin') !== null || 
                                               document.querySelector('.global-nav') !== null ||
                                               document.querySelector('nav[data-anonymize="top-navigation"]') !== null;
                    
                    return {
                        hasError,
                        hasProfileElements,
                        hasLinkedInStructure,
                        hasValidProfileContent,
                        title: document.title,
                        url: window.location.href
                    };
                });

                if (pageAnalysis.hasError) {
                    result.status = 'invalid';
                    result.error = 'Profile not found or deleted';
                } else if (pageAnalysis.hasProfileElements || pageAnalysis.hasValidProfileContent) {
                    result.status = 'valid';
                    result.error = null;
                } else if (pageAnalysis.hasLinkedInStructure) {
                    result.status = 'invalid';
                    result.error = 'LinkedIn page but no profile content found';
                } else {
                    result.status = 'invalid';
                    result.error = 'Not a LinkedIn profile page';
                }
                
                console.log(`   📊 ${pageAnalysis.hasProfileElements ? 'Profile Found' : 'No Profile'} - ${pageAnalysis.title.substring(0, 50)}...`);
                
                // Simulate human behavior on the page
                await browserManager.simulateHumanBehavior(page);
                
            } else if (response.status() === 404) {
                result.status = 'invalid';
                result.error = '404 - Profile not found';
            } else if (response.status() === 403) {
                result.status = 'invalid'; 
                result.error = '403 - Access denied';
            } else {
                result.status = 'invalid';
                result.error = `HTTP ${response.status()}`;
            }

            console.log(`   ✅ ${result.status.toUpperCase()} ${result.error ? '- ' + result.error : ''}`);
            
            // Random delay between requests
            const delay = Math.random() * 8000 + 5000; // 5-13 seconds
            await new Promise(resolve => setTimeout(resolve, delay));

        } catch (error) {
            console.error(`   ❌ Error validating ${linkedinUrl}:`, error.message);
            
            if (error.message.includes('ERR_TOO_MANY_REDIRECTS')) {
                result.error = 'Too many redirects - likely authentication issue';
                result.status = 'invalid';
            } else if (error.message.includes('timeout')) {
                result.error = 'Page load timeout';
                result.status = 'error';
            } else {
                result.error = error.message.includes('timeout') ? 'Page load timeout' : error.message;
                result.status = 'error';
            }
        }

        return result;
    }

    getResultSummary(results) {
        const summary = {
            total: results.length,
            valid: results.filter(r => r.status === 'valid').length,
            invalid: results.filter(r => r.status === 'invalid').length,
            errors: results.filter(r => r.status === 'error').length
        };
        return summary;
    }
}

module.exports = ProfileValidator;
