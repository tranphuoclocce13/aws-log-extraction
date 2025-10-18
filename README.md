# AWS Log Analyzer

A Node.js tool for analyzing AWS logs and extracting information from JSON log files.

## Features

- 📊 Overview statistics: start time, end time, total API calls
- 📈 API calls analysis: call count and average response time for each API
- ⚡ Find API with highest response time and timestamp
- ❌ Error classification and statistics

## Installation

1. Install dependencies:
```bash
npm install
```

2. Ensure `log.json` file is in the root directory

## Usage

```bash
npm start
```

or

```bash
node main.js
```

## Output

The program will display:

1. **Time information**: Start time, end time, total API calls
2. **API calls statistics**: List of APIs sorted by call count, including:
   - Call count
   - Average response time
3. **API with highest response time**: API and timestamp with highest response time
4. **Error classification**: Error types and details

## Project Structure

```
aws-log-extraction/
├── package.json          # Dependencies and scripts
├── main.js              # Main file containing analysis logic
├── log.json             # Log file to analyze
└── README.md            # Usage guide
```

## Dependencies

- `moment`: Time handling and date formatting