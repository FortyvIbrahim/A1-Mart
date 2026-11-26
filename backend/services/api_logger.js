const axios = require("axios");
const { uuid } = require("uuidv4");

// Sensitive headers to redact
const SENSITIVE_HEADERS = [
  "x-auth-token",
  "x-delium-key",
  "authorization",
  "customkey",
  "cookie",
];

// API type detection based on URL patterns
const API_TYPE_PATTERNS = {
  GOFRUGAL: /gofrugal\.com/i,
  DELIUM: /delium\.io/i,
  DIGISME: /indhrmsgateway|digisme/i,
};

/**
 * Sanitize headers by redacting sensitive values
 */
function sanitizeHeaders(headers) {
  if (!headers) return null;

  const sanitized = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.includes(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Detect API type from URL
 */
function detectApiType(url) {
  for (const [type, pattern] of Object.entries(API_TYPE_PATTERNS)) {
    if (pattern.test(url)) {
      return type;
    }
  }
  return "UNKNOWN";
}

/**
 * Create a logged axios instance
 * @param {Object} options
 * @param {string} options.apiType - API provider (GOFRUGAL, DELIUM, DIGISME, AWS_S3)
 * @param {string} options.secondaryType - Specific API endpoint type
 * @param {string} options.callerFile - File path of the caller
 * @param {Object} apiCallLogsUsecase - The usecase instance for logging
 */
function createLoggedAxios(options, apiCallLogsUsecase) {
  const { apiType, secondaryType, callerFile } = options;

  const instance = axios.create();

  // Request interceptor - add timing and correlation ID
  instance.interceptors.request.use(
    (config) => {
      config.metadata = {
        startTime: Date.now(),
        correlationId: uuid(),
        apiType: apiType || detectApiType(config.url),
        secondaryType: secondaryType,
        callerFile: callerFile,
        callerFunction: config.callerFunction || null,
      };
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - log success
  instance.interceptors.response.use(
    async (response) => {
      const { config } = response;
      const metadata = config.metadata || {};
      const timeTaken = Date.now() - (metadata.startTime || Date.now());

      const logEntry = {
        api_type: metadata.apiType || apiType,
        secondary_type: metadata.secondaryType || secondaryType,
        api_url: config.url,
        http_method: (config.method || "GET").toUpperCase(),
        status_code: response.status,
        time_taken_ms: timeTaken,
        is_success: 1,
        error_message: null,
        error_stack: null,
        request_headers: sanitizeHeaders(config.headers),
        request_body: config.data ? sanitizeRequestBody(config.data) : null,
        response_error_body: null,
        caller_function: metadata.callerFunction,
        caller_file: metadata.callerFile || callerFile,
        correlation_id: metadata.correlationId,
        retry_count: config.__retryCount || 0,
      };

      // Log asynchronously to not block the response
      if (apiCallLogsUsecase) {
        apiCallLogsUsecase.create(logEntry).catch((err) => {
          console.error("Failed to log API call:", err.message);
        });
      }

      return response;
    },
    async (error) => {
      const config = error.config || {};
      const metadata = config.metadata || {};
      const timeTaken = Date.now() - (metadata.startTime || Date.now());

      const logEntry = {
        api_type: metadata.apiType || apiType,
        secondary_type: metadata.secondaryType || secondaryType,
        api_url: config.url || "UNKNOWN",
        http_method: (config.method || "GET").toUpperCase(),
        status_code: error.response?.status || null,
        time_taken_ms: timeTaken,
        is_success: 0,
        error_message: error.message,
        error_stack: error.stack,
        request_headers: sanitizeHeaders(config.headers),
        request_body: config.data ? sanitizeRequestBody(config.data) : null,
        response_error_body: error.response?.data || null,
        caller_function: metadata.callerFunction,
        caller_file: metadata.callerFile || callerFile,
        correlation_id: metadata.correlationId,
        retry_count: config.__retryCount || 0,
      };

      // Log asynchronously
      if (apiCallLogsUsecase) {
        apiCallLogsUsecase.create(logEntry).catch((err) => {
          console.error("Failed to log API call error:", err.message);
        });
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * Sanitize request body (remove sensitive data)
 */
function sanitizeRequestBody(data) {
  if (!data) return null;

  // If it's a string, try to parse it
  let parsed = data;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      return data; // Return as-is if not JSON
    }
  }

  // Deep clone and sanitize
  const sanitized = JSON.parse(JSON.stringify(parsed));

  const sensitiveFields = ["password", "token", "secret", "key", "authorization"];
  function sanitizeObject(obj) {
    if (typeof obj !== "object" || obj === null) return;
    for (const key of Object.keys(obj)) {
      if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
        obj[key] = "[REDACTED]";
      } else if (typeof obj[key] === "object") {
        sanitizeObject(obj[key]);
      }
    }
  }

  sanitizeObject(sanitized);
  return sanitized;
}

/**
 * Log a curl exec call manually
 * @param {Object} options
 * @param {string} options.apiType - API provider
 * @param {string} options.secondaryType - Specific API type
 * @param {string} options.url - API URL
 * @param {string} options.method - HTTP method
 * @param {number} options.startTime - Start timestamp (Date.now())
 * @param {number|null} options.statusCode - HTTP status code
 * @param {Error|string|null} options.error - Error if any
 * @param {string} options.callerFunction - Function that made the call
 * @param {string} options.callerFile - File that made the call
 * @param {Object} options.requestHeaders - Request headers (will be sanitized)
 * @param {Object} apiCallLogsUsecase - The usecase instance for logging
 */
async function logCurlCall(options, apiCallLogsUsecase) {
  const {
    apiType,
    secondaryType,
    url,
    method = "GET",
    startTime,
    statusCode,
    error,
    callerFunction,
    callerFile = "services/synker.js",
    requestHeaders = null,
  } = options;

  const timeTaken = Date.now() - startTime;
  const isSuccess = !error && statusCode >= 200 && statusCode < 300;

  const logEntry = {
    api_type: apiType,
    secondary_type: secondaryType,
    api_url: url,
    http_method: method.toUpperCase(),
    status_code: statusCode,
    time_taken_ms: timeTaken,
    is_success: isSuccess ? 1 : 0,
    error_message: error ? (error.message || String(error)) : null,
    error_stack: error?.stack || null,
    request_headers: sanitizeHeaders(requestHeaders),
    request_body: null,
    response_error_body: null,
    caller_function: callerFunction,
    caller_file: callerFile,
    correlation_id: uuid(),
    retry_count: 0,
  };

  if (apiCallLogsUsecase) {
    try {
      await apiCallLogsUsecase.create(logEntry);
    } catch (err) {
      console.error("Failed to log curl call:", err.message);
    }
  }

  return logEntry;
}

/**
 * Log an AWS S3 SDK call manually
 * @param {Object} options
 * @param {string} options.secondaryType - Specific operation (UPLOAD, DELETE, etc.)
 * @param {string} options.fileName - File name being operated on
 * @param {string} options.bucketName - S3 bucket name
 * @param {number} options.startTime - Start timestamp (Date.now())
 * @param {Error|null} options.error - Error if any
 * @param {string} options.callerFunction - Function that made the call
 * @param {string} options.callerFile - File that made the call
 * @param {Object} apiCallLogsUsecase - The usecase instance for logging
 */
async function logS3Call(options, apiCallLogsUsecase) {
  const {
    secondaryType,
    fileName,
    bucketName = "a1-stores-bucket",
    startTime,
    error,
    callerFunction,
    callerFile = "services/s3.js",
  } = options;

  const timeTaken = Date.now() - startTime;
  const isSuccess = !error;

  const logEntry = {
    api_type: "AWS_S3",
    secondary_type: secondaryType,
    api_url: `s3://${bucketName}/${fileName}`,
    http_method: secondaryType === "UPLOAD" ? "PUT" : secondaryType === "DELETE" ? "DELETE" : "GET",
    status_code: isSuccess ? 200 : null,
    time_taken_ms: timeTaken,
    is_success: isSuccess ? 1 : 0,
    error_message: error ? (error.message || String(error)) : null,
    error_stack: error?.stack || null,
    request_headers: null,
    request_body: { fileName, bucketName },
    response_error_body: null,
    caller_function: callerFunction,
    caller_file: callerFile,
    correlation_id: uuid(),
    retry_count: 0,
  };

  if (apiCallLogsUsecase) {
    try {
      await apiCallLogsUsecase.create(logEntry);
    } catch (err) {
      console.error("Failed to log S3 call:", err.message);
    }
  }

  return logEntry;
}

module.exports = {
  createLoggedAxios,
  logCurlCall,
  logS3Call,
  sanitizeHeaders,
  detectApiType,
};
