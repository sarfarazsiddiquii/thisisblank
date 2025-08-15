module.exports = {
    // Input/Output settings
    INPUT_FILE: 'unprocessed urls experts - Sheet1.csv',
    OUTPUT_PREFIX: 'linkedin_validation_results_',
    
    // Processing settings
    DEFAULT_START_ROW: 1,
    DEFAULT_END_ROW: 10,
    DEFAULT_HEADLESS: false,
    
    // Rate limiting
    MAX_REQUESTS_PER_ACCOUNT: 5,
    REQUEST_DELAY_MIN: 5000,  
    REQUEST_DELAY_MAX: 13000, 
    
    // Browser settings
    BROWSER_ARGS: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--window-size=1366,768'
    ],
    
    // Validation settings
    PAGE_TIMEOUT: 30000,    
    NAVIGATION_TIMEOUT: 45000, 
    
    SCROLL_MIN: 300,
    SCROLL_MAX: 800,
    HOVER_DELAY_MIN: 500,
    HOVER_DELAY_MAX: 1200,
    BEHAVIOR_DELAY_MIN: 1000,
    BEHAVIOR_DELAY_MAX: 2500,
    
    // LinkedIn Profile Selectors
    PROFILE_SELECTORS: [
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
    ],
    
    // Error indicators
    ERROR_INDICATORS: [
        'this linkedin profile was not found',
        'page not found',
        'member not found',
        'profile doesn\'t exist',
        'user not found',
        'profile unavailable'
    ]
};
