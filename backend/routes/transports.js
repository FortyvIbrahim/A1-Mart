const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

const createSchema = Joi.object({
  asset_code: Joi.string().max(255).required(),
  asset_name: Joi.string().max(255).allow(null, "").optional(),
  vehicle_number: Joi.string().max(100).allow(null, "").optional(),
  engine_number: Joi.string().max(100).allow(null, "").optional(),
  chassis_number: Joi.string().max(100).allow(null, "").optional(),
  acquisition_type: Joi.string().max(50).allow(null, "").optional(),
  dependency_type: Joi.string().max(50).allow(null, "").optional(),
  working_status: Joi.string().max(50).allow(null, "").optional(),
  asset_description: Joi.string().allow(null, "").optional(),
  customer_asset_no: Joi.string().max(100).allow(null, "").optional(),
  sub_category: Joi.string().max(100).allow(null, "").optional(),
  hsn_code: Joi.string().max(50).allow(null, "").optional(),
  barcode_option: Joi.string().max(50).allow(null, "").optional(),
  barcode_no: Joi.string().max(100).allow(null, "").optional(),
  purchased_price: Joi.number().allow(null).optional(),
  purchased_date: Joi.date().allow(null).optional(),
  placed_in_service: Joi.date().allow(null).optional(),
  capitalization_date: Joi.date().allow(null).optional(),
  bill_no: Joi.string().max(100).allow(null, "").optional(),
  bill_date: Joi.date().allow(null).optional(),
  received_date: Joi.date().allow(null).optional(),
  serial_number: Joi.string().max(100).allow(null, "").optional(),
  model_number: Joi.string().max(100).allow(null, "").optional(),
  seller: Joi.string().max(255).allow(null, "").optional(),
  branch_id: Joi.number().integer().positive().allow(null).optional(),
  is_depreciation_applicable: Joi.string().valid("Yes", "No").allow(null).optional(),
  salvage_value: Joi.number().allow(null).optional(),
  exp_end_date: Joi.date().allow(null).optional(),
  asset_life_span: Joi.number().integer().allow(null).optional(),
  image_url: Joi.string().max(500).allow(null, "").optional(),
});

const updateSchema = Joi.object({
  asset_code: Joi.string().max(255),
  asset_name: Joi.string().max(255).allow(null, ""),
  vehicle_number: Joi.string().max(100).allow(null, ""),
  engine_number: Joi.string().max(100).allow(null, ""),
  chassis_number: Joi.string().max(100).allow(null, ""),
  acquisition_type: Joi.string().max(50).allow(null, ""),
  dependency_type: Joi.string().max(50).allow(null, ""),
  working_status: Joi.string().max(50).allow(null, ""),
  asset_description: Joi.string().allow(null, ""),
  customer_asset_no: Joi.string().max(100).allow(null, ""),
  sub_category: Joi.string().max(100).allow(null, ""),
  hsn_code: Joi.string().max(50).allow(null, ""),
  barcode_option: Joi.string().max(50).allow(null, ""),
  barcode_no: Joi.string().max(100).allow(null, ""),
  purchased_price: Joi.number().allow(null),
  purchased_date: Joi.date().allow(null),
  placed_in_service: Joi.date().allow(null),
  capitalization_date: Joi.date().allow(null),
  bill_no: Joi.string().max(100).allow(null, ""),
  bill_date: Joi.date().allow(null),
  received_date: Joi.date().allow(null),
  serial_number: Joi.string().max(100).allow(null, ""),
  model_number: Joi.string().max(100).allow(null, ""),
  seller: Joi.string().max(255).allow(null, ""),
  branch_id: Joi.number().integer().positive().allow(null),
  is_depreciation_applicable: Joi.string().valid("Yes", "No").allow(null),
  salvage_value: Joi.number().allow(null),
  exp_end_date: Joi.date().allow(null),
  asset_life_span: Joi.number().integer().allow(null),
  image_url: Joi.string().max(500).allow(null, ""),
}).min(1);

class TransportsRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    router.post("/", async (req, res) => {
      try {
        const { error, value } = createSchema.validate(req.body);
        if (error) throw error;

        const resp = await this.usecase.create(value);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.post("/bulk", async (req, res) => {
      try {
        const bulkSchema = Joi.array().items(createSchema).min(1);
        const { error, value } = bulkSchema.validate(req.body);
        if (error) throw error;

        const resp = await this.usecase.bulkCreate(value);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.put("/:transport_id", async (req, res) => {
      try {
        const transport_id = parseInt(req.params.transport_id, 10);
        if (Number.isNaN(transport_id)) {
          res.status(400).json({ code: 400, msg: "Invalid transport_id" });
          res.end();
          return;
        }
        const { error, value } = updateSchema.validate(req.body);
        if (error) throw error;

        const resp = await this.usecase.update(transport_id, value);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/", async (_req, res) => {
      try {
        const resp = await this.usecase.getAll();
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:transport_id", async (req, res) => {
      try {
        const transport_id = parseInt(req.params.transport_id, 10);
        if (Number.isNaN(transport_id)) {
          res.status(400).json({ code: 400, msg: "Invalid transport_id" });
          res.end();
          return;
        }
        const resp = await this.usecase.getById(transport_id);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:transport_id", async (req, res) => {
      try {
        const transport_id = parseInt(req.params.transport_id, 10);
        if (Number.isNaN(transport_id)) {
          res.status(400).json({ code: 400, msg: "Invalid transport_id" });
          res.end();
          return;
        }
        const resp = await this.usecase.delete(transport_id);
        res.json({ code: 200, data: resp });
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

module.exports = (usecase) => {
  return new TransportsRoutes(usecase);
};
