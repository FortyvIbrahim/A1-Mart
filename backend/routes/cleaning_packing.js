const router = require("express").Router();
const Joi = require("@hapi/joi");

class CleaningPackingRoutes {
  constructor(cleaningPackingUsecase) {
    this.cleaningPackingUsecase = cleaningPackingUsecase;
    this.init();
  }

  init() {
    // Create purchase item
    router.post("/", async (req, res) => {
      try {
        const schema = {
          purchase_item: Joi.number().required(),
          purchase_item_name: Joi.string().required(),
          article_id: Joi.number().allow(null),
          article_name: Joi.string().allow(null, ""),
          priority_score: Joi.number().allow(null),
          repackage_conversion: Joi.number().allow(null),
          planner: Joi.string().allow(null, ""),
          repack_quantity: Joi.number().allow(null),
          forecast_quantity: Joi.number().allow(null),
          order_date: Joi.date().allow(null),
          child_stock_in_hand: Joi.number().allow(null),
          parent_stock: Joi.number().allow(null),
          store_uom: Joi.number().allow(null),
          num_stores_oos: Joi.number().allow(null),
          chain_bill_count_level: Joi.string().allow(null, ""),
        };

        const purchaseItem = req.body;
        const isValid = Joi.validate(purchaseItem, schema);

        if (isValid.error !== null) {
          console.log(isValid.error);
          throw isValid.error;
        }

        const result = await this.cleaningPackingUsecase.create(purchaseItem);
        res.json({
          code: 200,
          msg: "Purchase item created successfully",
          data: result,
        });
      } catch (err) {
        console.log(err);
        if (err.name === "ValidationError") {
          res.json({ code: 422, msg: err.toString() });
        } else {
          res.json({ code: 500, msg: "An error occurred!" });
        }
      }
    });

    // Get all purchase items with optional filters
    router.get("/", async (req, res) => {
      try {
        const filters = {};

        // Date filter
        if (req.query.date) {
          filters.date = req.query.date;
        }

        // Cleaning filter
        if (req.query.cleaning !== undefined) {
          filters.cleaning =
            req.query.cleaning === "true"
              ? true
              : req.query.cleaning === "false"
              ? false
              : null;
        }

        // Packing type filter
        if (req.query.packing_type !== undefined) {
          filters.packing_type = req.query.packing_type
            ? parseInt(req.query.packing_type)
            : null;
        }

        // Packing material filter
        if (req.query.packing_material !== undefined) {
          filters.packing_material = req.query.packing_material
            ? parseInt(req.query.packing_material)
            : null;
        }

        // Packing material size filter
        if (req.query.packing_material_size !== undefined) {
          filters.packing_material_size = req.query.packing_material_size
            ? parseInt(req.query.packing_material_size)
            : null;
        }

        // Sticker filter
        if (req.query.sticker !== undefined) {
          filters.sticker =
            req.query.sticker === "true"
              ? true
              : req.query.sticker === "false"
              ? false
              : null;
        }

        const purchaseItems = await this.cleaningPackingUsecase.getAll(filters);
        res.json({ code: 200, data: purchaseItems });
      } catch (err) {
        console.log(err);
        res.json({ code: 500, msg: "An error occurred!" });
      }
    });

    // Delete all purchase items
    router.delete("/", async (req, res) => {
      try {
        const result = await this.cleaningPackingUsecase.deleteAll();
        res.json({
          code: 200,
          msg: "All purchase items deleted successfully",
          data: result,
        });
      } catch (err) {
        console.log(err);
        res.json({ code: 500, msg: "An error occurred!" });
      }
    });

    // Sync all data
    router.post("/sync", async (req, res) => {
      try {
        const result = await this.cleaningPackingUsecase.sync();
        res.json({ code: 200, msg: "Data successfully synced!" });
      } catch (err) {
        console.log(err);
        res.json({ code: 500, msg: "An error occurred!" });
      }
    });

    // Generate PDF report
    router.post("/pdf", async (req, res) => {
      try {
        // Get data array from request body
        const dataArray = req.body.data;
        if (!Array.isArray(dataArray)) {
          return res.json({
            code: 400,
            msg: "Data must be an array",
          });
        }

        // Get PDF name from request body
        const pdfName = req.body.pdf_name;
        if (pdfName && typeof pdfName !== "string") {
          return res.json({
            code: 400,
            msg: "PDF name must be a string",
          });
        }

        // Get custom headers from request body
        const customHeaders = req.body.headers;

        // Get custom title from request body
        const customTitle = req.body.title;

        // Get PDF formatting options from request body
        const size = req.body.size;
        const orientation = req.body.orientation;
        const marginSize = req.body.margin_size;

        // Validate headers if provided
        if (customHeaders && typeof customHeaders !== "object") {
          return res.json({
            code: 400,
            msg: "Headers must be an object",
          });
        }

        // Validate title if provided
        if (customTitle && typeof customTitle !== "string") {
          return res.json({
            code: 400,
            msg: "Title must be a string",
          });
        }

        // Validate size if provided
        if (size && !["xs", "sm", "md", "lg"].includes(size)) {
          return res.json({
            code: 400,
            msg: "Size must be one of: xs, sm, md, lg",
          });
        }

        // Validate orientation if provided
        if (orientation && !["portrait", "landscape"].includes(orientation)) {
          return res.json({
            code: 400,
            msg: "Orientation must be either 'portrait' or 'landscape'",
          });
        }

        // Validate margin size if provided
        if (marginSize && typeof marginSize !== "string") {
          return res.json({
            code: 400,
            msg: "Margin size must be a string",
          });
        }

        if (marginSize && !/^\d+(mm|px|in|cm)$/.test(marginSize)) {
          return res.json({
            code: 400,
            msg: "Margin size must be in format like '15mm', '20px', '1in', '2cm'",
          });
        }

        // Call usecase method to generate PDF
        const result = await this.cleaningPackingUsecase.generatePDF(
          dataArray,
          pdfName,
          customHeaders,
          customTitle,
          size,
          orientation,
          marginSize
        );

        res.json({
          code: 200,
          msg: "PDF generated successfully",
          data: result,
        });
      } catch (err) {
        console.error("PDF generation error:", err);

        // Handle specific error cases
        if (err.message === "No data provided for PDF generation") {
          return res.json({
            code: 404,
            msg: err.message,
          });
        }

        if (err.message === "Data must be an array") {
          return res.json({
            code: 400,
            msg: err.message,
          });
        }

        if (err.message === "PDF service not initialised") {
          return res.json({
            code: 500,
            msg: "PDF service not available",
          });
        }

        res.json({
          code: 500,
          msg: `An error occurred while generating PDF: ${err.message}`,
        });
      }
    });
  }

  getRouter() {
    return router;
  }
}

module.exports = (cleaningPackingUsecase) => {
  return new CleaningPackingRoutes(cleaningPackingUsecase);
};
