const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");
const pdfService = require("../services/pdf");

class PdfGeneratorRoutes {
  constructor() {
    this.init();
  }

  init() {
    router.post("/", async (req, res) => {
      try {
        const schema = {
          data: Joi.array().min(1).required(),
          pdf_name: Joi.string().optional(),
          headers: Joi.object().optional(),
          title: Joi.string().optional(),
          size: Joi.string()
            .valid("xs", "sm", "md", "lg")
            .default("md")
            .optional(),
          orientation: Joi.string()
            .valid("portrait", "landscape")
            .default("landscape")
            .optional(),
          margin_size: Joi.string()
            .regex(/^\d+(mm|px|in|cm)$/)
            .default("0mm")
            .optional(),
          s3_folder: Joi.string().default("pdfs").optional(),
        };

        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) {
          throw isValid.error;
        }

        const {
          data: dataArray,
          pdf_name: pdfName,
          headers: customHeaders,
          title: customTitle,
          size = "md",
          orientation = "landscape",
          margin_size: marginSize = "15mm",
          s3_folder: s3Folder = "pdfs",
        } = isValid.value;

        // Use custom headers or default headers mapping
        const headersMapping = customHeaders || {
          purchase_item: "Purchase Item ID",
          purchase_item_name: "Item Name",
          article_id: "Article ID",
          article_name: "Article Name",
          priority_score: "Priority Score",
          repackage_conversion: "Repackage Conversion",
          planner: "Planner",
          repack_quantity: "Repack Quantity",
          forecast_quantity: "Forecast Quantity",
          order_date: "Order Date",
          child_stock_in_hand: "Child Stock",
          parent_stock: "Parent Stock",
          store_uom: "Store UOM",
          num_stores_oos: "Stores OOS",
          chain_bill_count_level: "Bill Count Level",
        };

        // Generate PDF and upload to S3
        const result = await pdfService.generateTablePDFToS3(
          dataArray,
          headersMapping,
          pdfName,
          customTitle,
          size,
          orientation,
          marginSize,
          s3Folder
        );

        res.json({
          code: 200,
          msg: "PDF generated and uploaded to S3 successfully",
          data: result,
        });
      } catch (err) {
        respondError(res, err);
      }

      res.end();
    });
  }

  getRouter() {
    return router;
  }
}

module.exports = () => {
  return new PdfGeneratorRoutes();
};
