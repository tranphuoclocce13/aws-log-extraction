const fs = require('fs');
const path = require('path');
const moment = require('moment');

class LogAnalyzer {
    constructor(logFilePath) {
        this.logFilePath = logFilePath;
        this.logs = [];
        this.apiStats = new Map();
        this.errors = [];
        this.startTime = null;
        this.endTime = null;
    }

    // Load and parse log file
    loadLogs() {
        try {
            const logData = fs.readFileSync(this.logFilePath, 'utf8');
            this.logs = JSON.parse(logData);
            console.log(`✅ Loaded ${this.logs.length} log entries`);
        } catch (error) {
            console.error('❌ Error reading log file:', error.message);
            process.exit(1);
        }
    }

    // Analyze logs
    analyze() {
        console.log('\n🔍 Starting log analysis...\n');

        // Filter log entries with request information
        const requestLogs = this.logs.filter(log => 
            log['@message'] && 
            typeof log['@message'] === 'object' && 
            log['@message'].req
        );

        console.log(`📊 Found ${requestLogs.length} API calls`);

        // Calculate start time and end time
        this.calculateTimeRange(requestLogs);
        
        // Analyze each API call
        this.analyzeApiCalls(requestLogs);
        
        // Find API with highest response time
        this.findHighestResponseTime(requestLogs);
        
        // Analyze errors
        this.analyzeErrors();

        // Display results
        this.displayResults();
    }

    // Calculate start time and end time
    calculateTimeRange(requestLogs) {
        if (requestLogs.length === 0) return;

        const timestamps = requestLogs.map(log => {
            const timestamp = log['@message'].time;
            return new Date(timestamp);
        });

        this.startTime = new Date(Math.min(...timestamps));
        this.endTime = new Date(Math.max(...timestamps));
    }

    // Analyze API calls
    analyzeApiCalls(requestLogs) {
        requestLogs.forEach(log => {
            const message = log['@message'];
            const req = message.req;
            const res = message.res;
            const responseTime = message.responseTime;

            if (!req || !req.url) return;

            const apiPath = req.url;
            const method = req.method || 'UNKNOWN';

            // Create key for API
            const apiKey = `${method} ${apiPath}`;

            if (!this.apiStats.has(apiKey)) {
                this.apiStats.set(apiKey, {
                    count: 0,
                    totalResponseTime: 0,
                    responseTimes: [],
                    method: method,
                    path: apiPath
                });
            }

            const stats = this.apiStats.get(apiKey);
            stats.count++;
            stats.totalResponseTime += responseTime || 0;
            stats.responseTimes.push(responseTime || 0);
        });
    }

    // Find API with highest response time
    findHighestResponseTime(requestLogs) {
        let maxResponseTime = 0;
        let maxResponseTimeLog = null;

        requestLogs.forEach(log => {
            const message = log['@message'];
            const responseTime = message.responseTime || 0;
            
            if (responseTime > maxResponseTime) {
                maxResponseTime = responseTime;
                maxResponseTimeLog = log;
            }
        });

        this.highestResponseTime = {
            time: maxResponseTime,
            log: maxResponseTimeLog
        };
    }

    // Analyze errors
    analyzeErrors() {
        this.logs.forEach(log => {
            const message = log['@message'];
            
            // Check for error in response
            if (message && typeof message === 'object') {
                if (message.err) {
                    this.errors.push({
                        type: 'Request Error',
                        error: message.err,
                        timestamp: log['@timestamp'],
                        url: message.req ? message.req.url : 'Unknown'
                    });
                }
                
                // Check for error status codes
                if (message.res && message.res.statusCode >= 400) {
                    this.errors.push({
                        type: 'HTTP Error',
                        statusCode: message.res.statusCode,
                        timestamp: log['@timestamp'],
                        url: message.req ? message.req.url : 'Unknown'
                    });
                }
            }

            // Check for other error messages
            if (typeof message === 'string' && message.toLowerCase().includes('error')) {
                this.errors.push({
                    type: 'System Error',
                    message: message,
                    timestamp: log['@timestamp']
                });
            }
        });
    }

    // Display results
    displayResults() {
        console.log('\n' + '='.repeat(80));
        console.log('📈 LOG ANALYSIS RESULTS');
        console.log('='.repeat(80));

        // 1. Time information and total API calls
        console.log('\n🕐 TIME INFORMATION:');
        console.log(`   Start Time: ${this.startTime ? moment(this.startTime).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}`);
        console.log(`   End Time: ${this.endTime ? moment(this.endTime).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}`);
        console.log(`   Total API calls: ${this.logs.filter(log => log['@message'] && log['@message'].req).length}`);

        // 2. API calls statistics
        console.log('\n📊 API CALLS STATISTICS (sorted by call count):');
        const sortedApis = Array.from(this.apiStats.entries())
            .sort((a, b) => b[1].count - a[1].count);

        sortedApis.forEach(([apiKey, stats], index) => {
            if (index >= 10) return;
            const avgResponseTime = stats.count > 0 ? (stats.totalResponseTime / stats.count).toFixed(2) : 0;
            console.log(`   ${index + 1}. ${apiKey}`);
            console.log(`      - Call count: ${stats.count}`);
            console.log(`      - Average response time: ${avgResponseTime}ms`);
            console.log('');
        });

        // 3. API with highest response time
        console.log('⚡ API WITH HIGHEST RESPONSE TIME:');
        if (this.highestResponseTime && this.highestResponseTime.log) {
            const log = this.highestResponseTime.log;
            const message = log['@message'];
            console.log(`   API: ${message.req.method} ${message.req.url}`);
            console.log(`   Response Time: ${this.highestResponseTime.time}ms`);
            console.log(`   Timestamp: ${log['@timestamp']}`);
        } else {
            console.log('   No data found');
        }

        // 4. Error types
        console.log('\n❌ ERROR TYPES:');
        if (this.errors.length === 0) {
            console.log('   No errors detected');
        } else {
            const errorTypes = {};
            this.errors.forEach(error => {
                if (!errorTypes[error.type]) {
                    errorTypes[error.type] = 0;
                }
                errorTypes[error.type]++;
            });

            Object.entries(errorTypes).forEach(([type, count]) => {
                console.log(`   - ${type}: ${count} times`);
            });

            console.log('\n📋 ERROR DETAILS:');
            this.errors.slice(0, 10).forEach((error, index) => {
                console.log(`   ${index + 1}. [${error.type}] ${error.timestamp}`);
                if (error.url) console.log(`      URL: ${error.url}`);
                if (error.statusCode) console.log(`      Status: ${error.statusCode}`);
                if (error.message) console.log(`      Message: ${error.message.substring(0, 100)}...`);
                console.log('');
            });

            if (this.errors.length > 10) {
                console.log(`   ... and ${this.errors.length - 10} more errors`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ Analysis completed!');
        console.log('='.repeat(80));
    }
}

// Main execution
function main() {
    console.log('🚀 AWS Log Analyzer');
    console.log('==================\n');

    const logFilePath = path.join(__dirname, 'logs-insights-results.json');
    
    if (!fs.existsSync(logFilePath)) {
        console.error('❌ logs-insights-results.json file not found');
        process.exit(1);
    }

    const analyzer = new LogAnalyzer(logFilePath);
    analyzer.loadLogs();
    analyzer.analyze();
}

// Run the program
if (require.main === module) {
    main();
}

module.exports = LogAnalyzer;
