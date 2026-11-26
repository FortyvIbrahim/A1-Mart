const formidable = require("formidable");
const FileType = require("file-type");
const { uuid } = require("uuidv4");
const slug = require("slug");

const logger = require("../utils/logger");

const IMAGE = require("../services/image");
const S3 = require("../services/s3");

const ALLOWED_FILE_TYPES = {
  image: true,
  pdf: true,
};

const ALLOWED_FOLDERS = {
  materials: true,
  tasks: true,
  "purchase-entry": true,
  "tasks/comments": true,
  products: true,
  grn: true,
  employees: true,
  "wms-purchase-entry": true,
  "payments": true,
  "receipts": true,
  "purchase-returns": true,
  transports: true,
  checklist: true
};

class AssetUsecase {
  constructor() { }

  upload(req) {
    return new Promise((resolve, reject) => {
      const form = new formidable.IncomingForm();
      form.multiples = false;
      //5 MB
      form.maxFileSize = 10 * 1024 * 1024;
      form.parse(req, async (err, fields, files) => {
        try {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "USECASE",
              code: "USECASE.ASSET.UPLOAD",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          if (fields.name?.[0] === undefined) {
            resolve({ code: 422, msg: "Asset name is required" });
            return;
          }

          if (fields.folder?.[0] === undefined) {
            resolve({ code: 422, msg: "Asset folder is required" });
            return;
          }

          if (files.file?.[0] === undefined || files.file?.[0]?.type === null) {
            resolve({ code: 422, msg: "Asset is required" });
            return;
          }

          if (!ALLOWED_FOLDERS[fields.folder?.[0]]) {
            resolve({ code: 422, msg: "Invalid asset folder" });
            return;
          }

          const file = files.file?.[0];

          const fileTypeResult = await FileType.fileTypeFromFile(file.filepath);

          let fileExtenion, mime;

          if (!fileTypeResult) {
            // Handle SVG files which file-type doesn't support
            const fileName = file.originalFilename || "";
            const fileExtension = fileName.split(".").pop()?.toLowerCase();

            if (fileExtension === "svg") {
              fileExtenion = "svg";
              mime = "image/svg+xml";
            } else {
              resolve({ code: 422, msg: "Unable to determine file type" });
              return;
            }
          } else {
            const result = fileTypeResult;
            fileExtenion = result.ext;
            mime = result.mime;
          }
          // const fileType = IMAGE.getFileType(mime);

          // if (!ALLOWED_FILE_TYPES[fileType]) {
          //   resolve({ code: 422, msg: "Invalid asset type" });
          //   return;
          // }

          const fileName =
            fields.folder?.[0] +
            "/" +
            slug.default(fields.name?.[0]) +
            "-" +
            uuid() +
            "." +
            fileExtenion;

          // if (
          //   fileExtenion != "webp" &&
          //   fileExtenion != "pdf" &&
          //   fileExtenion != "svg"
          // )
          //   await IMAGE.compress(file.filepath, file.filepath);
          const remoteUrl = await S3.uploadFile(file.filepath, fileName, mime);
          resolve({ code: 200, remoteUrl });
        } catch (err) {
          reject(err);
          console.log(err);
          return;
        }
      });
    });
  }
}

module.exports = new AssetUsecase();
