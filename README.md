# Ksense Healthcare API Assessment

This project is a solution for the DemoMed Healthcare API assessment.

It retrieves paginated patient data, handles unreliable API behavior, calculates risk scores, generates required patient alert lists, and submits the results back to the assessment API.

---

## Overview

The script performs the following steps:

1. Fetches all patient records from the API
2. Handles:
   - pagination
   - intermittent API failures
   - rate limiting
   - malformed responses
3. Calculates patient risk scores using:
   - blood pressure
   - temperature
   - age
4. Produces the required output lists:
   - `high_risk_patients`
   - `fever_patients`
   - `data_quality_issues`
5. Submits the results to the assessment endpoint

---

## Tech Stack

- Node.js
- Axios
- dotenv

---

## Project Structure

```txt
ksense-assessment/
├── index.js
├── package.json
├── package-lock.json
├── .env
├── .gitignore
└── README.md

```

## Project Setup

```txt
# clone the repo
git clone https://github.com/YOUR-USERNAME/ksense-assessment.git
cd ksense-assessment

# install dependencies
npm install

# create .env file
API_KEY=your_api_key_here
BASE_URL=https://assessment.ksensetech.com/api

# run the script
npm start

```

## Test Results

```txt
Analysis Results: {
  high_risk_patients: [
    'DEMO002', 'DEMO006', 'DEMO007',
    'DEMO008', 'DEMO009', 'DEMO010',
    'DEMO012', 'DEMO016', 'DEMO019',
    'DEMO020', 'DEMO021', 'DEMO022',
    'DEMO027', 'DEMO028', 'DEMO031',
    'DEMO032', 'DEMO033', 'DEMO037',
    'DEMO040', 'DEMO041', 'DEMO045',
    'DEMO048'
  ],
  fever_patients: [
    'DEMO005', 'DEMO008',
    'DEMO009', 'DEMO012',
    'DEMO021', 'DEMO023',
    'DEMO037', 'DEMO038',
    'DEMO047'
  ],
  data_quality_issues: [
    'DEMO004', 'DEMO005',
    'DEMO007', 'DEMO023',
    'DEMO024', 'DEMO035',
    'DEMO036', 'DEMO043'
  ]
}
{
  "success": true,
  "message": "Assessment submitted successfully",
  "requestId": "iad1::rcssk-1774664141457-afc1913199ed",
  "results": {
    "score": 95,
    "percentage": 95,
    "status": "PASS",
    "breakdown": {
      "high_risk": {
        "score": 45,
        "max": 50,
        "correct": 20,
        "submitted": 22,
        "matches": 20
      },
      "fever": {
        "score": 25,
        "max": 25,
        "correct": 9,
        "submitted": 9,
        "matches": 9
      },
      "data_quality": {
        "score": 25,
        "max": 25,
        "correct": 8,
        "submitted": 8,
        "matches": 8
      }
    },
    "feedback": {
      "strengths": [
        "✅ Fever patients: Perfect score (9/9)",
        "✅ Data quality issues: Perfect score (8/8)"
      ],
      "issues": [
        "🔄 High-risk patients: 20/20 correct, but 2 incorrectly included"
      ]
    },
    "attempt_number": 2,
    "max_attempts": 3,
    "remaining_attempts": 1,
    "is_personal_best": true,
    "best_score": 95,
    "best_attempt_number": 2,
    "can_resubmit": true,
    "processed_in_ms": 181
  }
}
```
