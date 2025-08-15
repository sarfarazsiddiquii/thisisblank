require('dotenv').config();
const fs = require('fs');
const path = require('path');
const LinkedInValidator = require('./validator');


function formatResult(result) {
  const cleanResult = {
    url: result.url,
    httpCode: result.httpCode,
    valid: result.valid,
    timestamp: new Date().toISOString()
  };

  if (result.linkedIn) {
    cleanResult.linkedIn = result.linkedIn;
    cleanResult.profileType = result.profileType;
  }

  if (result.redirectUrl && result.redirectUrl !== result.url) {
    cleanResult.redirectUrl = result.redirectUrl;
  }

  if (result.error) {
    cleanResult.error = result.error;
    cleanResult.errorType = result.errorType;
  }

  return cleanResult;
}

async function saveResults(data, filename = 'results.json') {
  const outputDir = process.env.OUTPUT_DIR || './';
  
  if (outputDir !== './' && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filepath = path.join(outputDir, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`\nResults saved to: ${filepath}`);
  } catch (error) {
    console.error(`Failed : ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await handleBatchValidation(['--batch', 'urls.txt']);
    return;
  }
  
  if (args[0] === '--help') {
    showUsage();
    return;
  }

  try {
    if (args[0] === '--single') {
      await handleSingleValidation(args.slice(1));
    } else if (args[0] === '--batch') {
      await handleBatchValidation(args);
    } else {
      await handleSingleValidation(args);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function handleSingleValidation(args) {
  const url = args[0];
  const cookies = process.env.LINKEDIN_COOKIES;

  if (!url) {
    throw new Error('URL is required for single validation');
  }

  if (!cookies) {
    throw new Error('LinkedIn cookies are required. Set LINKEDIN_COOKIES in .env file.');
  }
  
  const validator = new LinkedInValidator(cookies);
  const result = await validator.validateUrl(url);
  
  const cleanResult = formatResult(result);
  console.log(JSON.stringify(cleanResult, null, 2));
  
  // Save to file
  const outputData = {
    timestamp: new Date().toISOString(),
    mode: 'single',
    totalUrls: 1,
    validUrls: result.valid ? 1 : 0,
    invalidUrls: result.valid ? 0 : 1,
    results: [cleanResult]
  };
  
  const outputFile = args.find((arg, index) => args[index - 1] === '--output') || 'single-result.json';
  await saveResults(outputData, outputFile);
}

async function handleBatchValidation(args) {
  const cookies = process.env.LINKEDIN_COOKIES;
  
  if (!cookies) {
    throw new Error('LinkedIn cookies are required. Set LINKEDIN_COOKIES in .env file.');
  }

  let urlsFile = 'urls.txt';
  if (args.length > 1 && !args[1].startsWith('--')) {
    urlsFile = args[1];
  }

  const outputIndex = args.indexOf('--output');
  const outputFile = outputIndex !== -1 && args[outputIndex + 1] 
    ? args[outputIndex + 1] 
    : 'results.json';
  
  if (!fs.existsSync(urlsFile)) {
    throw new Error(`URLs file not found: ${urlsFile}`);
  }

  const urls = fs.readFileSync(urlsFile, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  if (urls.length === 0) {
    throw new Error('No URLs found in file');
  }

  console.log(`validating ${urls.length} URLs...`);

  const validator = new LinkedInValidator(cookies);
  const results = await validator.validateUrls(urls);

  const formattedResults = results.map(formatResult);
  
  // Create output data
  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.length - validCount;
  
  const outputData = {
    timestamp: new Date().toISOString(),
    mode: 'batch',
    sourceFile: urlsFile,
    totalUrls: results.length,
    validUrls: validCount,
    invalidUrls: invalidCount,
    settings: {
      minDelay: process.env.MIN_DELAY || '2000',
      maxDelay: process.env.MAX_DELAY || '6000',
      batchDelay: process.env.BATCH_DELAY || '3000'
    },
    results: formattedResults
  };

  console.log(`\nSummary: ${validCount} valid, ${invalidCount} invalid out of ${results.length} URLs`);

  // Save to file
  await saveResults(outputData, outputFile);
}

if (require.main === module) {
  main();
}

module.exports = { LinkedInValidator };
