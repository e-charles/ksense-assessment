require("dotenv").config();
const axios = require("axios");

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to fetch data from the API with retry logic w/ exponential backoff
async function fetchData(func, maxRetries = 5) {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      return await func();
    } catch (error) {
      const status = error.response ? error.response.status : null;
      const retryable = [429, 500, 503].includes(status);

      attempts++;
      if (!retryable || attempts >= maxRetries) {
        throw error;
      }
      const retryDelay = Math.pow(2, attempts) * 1000;
      console.warn(
        `Attempt ${attempts}/${maxRetries} failed. Retrying in ${retryDelay / 1000} seconds...`,
      );
      await sleep(retryDelay);
    }
  }
}

async function getPatients(limit = 5) {
  let allPatients = [];
  const seenIds = new Set();

  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const res = await fetchData(async () => {
      const response = await client.get(
        `/patients?page=${page}&limit=${limit}`,
      );
      const body = response.data;

      // force retry if the API returns malformed success data
      if (!body || !Array.isArray(body.data) || !body.pagination) {
        throw new Error(`Malformed response on page ${page}`);
      }

      return response;
    });

    const resBody = res.data;
    const patients = resBody.data;
    const pagination = resBody.pagination;

    for (const patient of patients) {
      if (patient?.patient_id && !seenIds.has(patient.patient_id)) {
        seenIds.add(patient.patient_id);
        allPatients.push(patient);
      }
    }

    console.log(
      `Fetched page ${pagination.page}/${pagination.totalPages} - got ${patients.length} patients (total unique: ${allPatients.length})`,
    );

    hasNext = Boolean(pagination.hasNext);
    page++;

    // slight delay to reduce 429s
    await sleep(300);
  }

  return allPatients;
}

function parseBloodPressure(bp) {
  if (bp == null || typeof bp !== "string" || !bp.includes("/")) {
    return { valid: false };
  }

  const [systolicStr, diastolicStr] = bp.split("/");

  if (!systolicStr || !diastolicStr) {
    return { valid: false };
  }

  const systolic = Number(systolicStr.trim());
  const diastolic = Number(diastolicStr.trim());

  if (isNaN(systolic) || isNaN(diastolic)) {
    return { valid: false };
  }

  return { valid: true, systolic, diastolic };
}

function scoreBloodPressure(bp) {
  const { valid, systolic, diastolic } = parseBloodPressure(bp);
  if (!valid) {
    return { valid: false, score: 0 };
  }

  if (systolic >= 140 || diastolic >= 90) {
    return { valid: true, score: 3 };
  } else if (
    (systolic >= 130 && systolic <= 139) ||
    (diastolic >= 80 && diastolic <= 89)
  ) {
    return { valid: true, score: 2 };
  } else if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
    return { valid: true, score: 1 };
  } else {
    return { valid: true, score: 0 };
  }
}

function scoreTemp(temp) {
  if (temp == null || temp === "") {
    return { valid: false, score: 0 };
  }

  const tempNum = Number(temp);
  if (isNaN(tempNum)) {
    return { valid: false, score: 0 };
  }

  if (tempNum >= 101.0) {
    return { valid: true, score: 2, value: tempNum };
  } else if (tempNum >= 99.6 && tempNum <= 100.9) {
    return { valid: true, score: 1, value: tempNum };
  } else if (tempNum <= 99.5) {
    return { valid: true, score: 0, value: tempNum };
  }
  return { valid: false, score: 0 };
}

function scoreAge(age) {
  if (age == null || age === "") {
    return { valid: false, score: 0 };
  }

  const ageNum = Number(age);
  if (isNaN(ageNum)) {
    return { valid: false, score: 0 };
  }

  if (ageNum > 65) {
    return { valid: true, score: 2, value: ageNum };
  } else if (ageNum >= 0 && ageNum <= 65) {
    return { valid: true, score: 1, value: ageNum };
  }

  return { valid: false, score: 0 };
}

async function analyzePatients(patients) {
  const highRiskPatients = [];
  const feverPatients = [];
  const dataIssues = [];

  for (const patient of patients) {
    const patientId = patient?.patient_id;
    if (!patientId) continue;

    const bp = scoreBloodPressure(patient.blood_pressure);
    const temp = scoreTemp(patient.temperature);
    const age = scoreAge(patient.age);

    const totalRisk = bp.score + temp.score + age.score;

    const hasDataIssue = [bp, temp, age].some((metric) => !metric.valid);

    if (totalRisk >= 4) {
      highRiskPatients.push(patientId);
    }

    if (temp.valid && temp.value >= 99.6) {
      feverPatients.push(patientId);
    }

    if (hasDataIssue) {
      dataIssues.push(patientId);
    }
  }
  return {
    high_risk_patients: highRiskPatients,
    fever_patients: feverPatients,
    data_quality_issues: dataIssues,
  };
}

async function submitResults(results) {
  const res = await fetchData(() => client.post("/submit-assessment", results));
  return res.data;
}

async function main() {
  try {
    console.log("Fetching patient data...");
    const patients = await getPatients(5);
    console.log(`Fetched ${patients.length} patients. Analyzing data...`);
    const analysisResults = await analyzePatients(patients);

    console.log("Analysis Results:", analysisResults);
    const submissionResponse = await submitResults(analysisResults);
    console.log(JSON.stringify(submissionResponse, null, 2));
  } catch (error) {
    console.error("Error running assessment:", error.message);

    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    } else {
      console.error(error.message);
    }
  }
}

main();
