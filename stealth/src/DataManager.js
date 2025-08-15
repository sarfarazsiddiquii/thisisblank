const fs = require('fs').promises;
const csvParser = require('csv-parser');
const { createReadStream } = require('fs');

class DataManager {
    async loadUrlsFromCsv(filePath) {
        return new Promise((resolve, reject) => {
            const urls = [];
            createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (row) => {
                    // CSV format: "Expert ID", "Linkedin Profile"
                    const expertId = row['Expert ID']?.trim();
                    const linkedinUrl = row['Linkedin Profile']?.trim();
                    
                    if (expertId && linkedinUrl && linkedinUrl.includes('linkedin.com')) {
                        urls.push({
                            expertId: expertId,
                            linkedinUrl: linkedinUrl
                        });
                    }
                })
                .on('end', () => {
                    console.log(`📊 Loaded ${urls.length} URLs from CSV`);
                    resolve(urls);
                })
                .on('error', reject);
        });
    }

    async saveResults(results, outputPath) {
        // Create CSV content manually to match your preferred format
        const headers = 'Expert_ID,LinkedIn_URL,Status,Error,Status_Code,Account_Used,Timestamp\n';
        const rows = results.map(r => {
            const expertId = r.expertId || '';
            const url = `"${r.linkedinUrl || ''}"`;
            const status = r.status || '';
            const error = `"${(r.error || '').replace(/"/g, '""')}"`;
            const statusCode = r.statusCode || '';
            const account = r.accountUsed || '';
            const timestamp = r.timestamp || '';
            
            return `${expertId},${url},${status},${error},${statusCode},${account},${timestamp}`;
        }).join('\n');

        await fs.writeFile(outputPath, headers + rows + '\n');
        console.log(`💾 Results saved to ${outputPath}`);
    }

    async checkFileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = DataManager;
