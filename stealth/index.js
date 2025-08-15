const LinkedInValidator = require('./src/LinkedInValidator');
const DataManager = require('./src/DataManager');
const config = require('./config');

// Configuration
const INPUT_FILE = config.INPUT_FILE;
const OUTPUT_FILE_PREFIX = config.OUTPUT_PREFIX;
const DEFAULT_START_ROW = config.DEFAULT_START_ROW;
const DEFAULT_END_ROW = config.DEFAULT_END_ROW;

// Usage
async function main() {
    const validator = new LinkedInValidator();
    const dataManager = new DataManager();
    
    const inputFile = INPUT_FILE;
    const outputFile = `${OUTPUT_FILE_PREFIX}${Date.now()}.csv`;
    
    // Check if input file exists
    const fileExists = await dataManager.checkFileExists(inputFile);
    if (!fileExists) {
        console.error(`❌ Input file '${inputFile}' not found`);
        return;
    }
    
    // Parse CLI arguments
    const { start, end } = parseArgs();
    let maxUrls = null;
    if (end !== null) {
        if (end < start) {
            return;
        }
        maxUrls = end - start + 1;
    }

    console.log(`🎯 Processing range: start=${start}${end !== null ? ' end=' + end : ''}`);

    // Process URLs
    await validator.processUrls(inputFile, outputFile, start, maxUrls);
}

function parseArgs() {
    const args = process.argv.slice(2);
    let start = DEFAULT_START_ROW;
    let end = DEFAULT_END_ROW;
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if ((arg === '--start' || arg === '-s') && args[i + 1]) {
            const n = parseInt(args[i + 1], 10);
            if (!Number.isNaN(n) && n > 0) start = n;
        }
        if ((arg === '--end' || arg === '-e') && args[i + 1]) {
            const m = parseInt(args[i + 1], 10);
            if (!Number.isNaN(m) && m > 0) end = m;
        }
    }
    return { start, end };
}

process.on('SIGINT', async () => {
    console.log('\n Shutting down...');
    process.exit(0);
});

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { LinkedInValidator, main };
