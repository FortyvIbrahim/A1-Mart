const AWS = require("aws-sdk");
const fs = require("fs");

const logger = require("../utils/logger");
const { logS3Call } = require("./api_logger");

const ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET = process.env.AWS_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.AWS_S3_BUCKET || "a1-stores-bucket";

const FILE_PERMISSION = "public-read";

// Check if S3 logging is enabled (default: false)
const isS3LoggingEnabled = () => {
  return process.env.ENABLE_S3_LOGGING === "true";
};

const s3 = new AWS.S3({
  accessKeyId: ID,
  secretAccessKey: SECRET,
});

// Store the apiCallLogsUsecase reference
let apiCallLogsUsecase = null;

/**
 * Set the API call logs usecase for logging S3 operations
 * @param {Object} usecase - The apiCallLogsUsecase instance
 */
const setApiCallLogsUsecase = (usecase) => {
  apiCallLogsUsecase = usecase;
};

const uploadFile = (filePath, fileName, contentType, fileData) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const file = filePath == undefined ? fileData : fs.readFileSync(filePath);

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: contentType,
      ACL: FILE_PERMISSION,
    };

    s3.upload(params, async (err, data) => {
      if (err) {
        // Log the failed S3 call (only if S3 logging is enabled)
        if (isS3LoggingEnabled()) {
          await logS3Call(
            {
              secondaryType: "UPLOAD",
              fileName,
              bucketName: BUCKET_NAME,
              startTime,
              error: err,
              callerFunction: "uploadFile",
              callerFile: "services/s3.js",
            },
            apiCallLogsUsecase
          );
        }

        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE",
          code: "SERVICE.S3.UPLOAD",
          description: err.toString(),
          category: "",
          ref: {},
        });
        reject(err);
        return;
      }

      // Log the successful S3 call (only if S3 logging is enabled)
      if (isS3LoggingEnabled()) {
        await logS3Call(
          {
            secondaryType: "UPLOAD",
            fileName,
            bucketName: BUCKET_NAME,
            startTime,
            error: null,
            callerFunction: "uploadFile",
            callerFile: "services/s3.js",
          },
          apiCallLogsUsecase
        );
      }

      resolve(data.Location);
    });
  });
};

module.exports = {
  uploadFile: uploadFile,
  setApiCallLogsUsecase: setApiCallLogsUsecase,
};
