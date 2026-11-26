const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class PurchaseEntryRoutes {
  constructor(purchaseEntryUsecase) {
    this.purchaseEntryUsecase = purchaseEntryUsecase;
    this.init();
  }

  init() {
    // Purchase Entry Item Schema
    const purchaseEntryItemSchema = Joi.object({
      purchase_entry_item_id: Joi.number().integer().min(1).optional(),
      material_id: Joi.number().required(),
      quantity: Joi.number().integer().min(1).required(),
      rate: Joi.number().precision(2).min(0).required(),
    });

    // Purchase Entry Schema
    const purchaseEntrySchema = Joi.object({
      purchase_order_id: Joi.number().integer().min(1).optional().allow(null),
      invoice_no: Joi.string().max(255).optional().allow(null, ""),
      invoice_date: Joi.date().optional().allow(null),
      invoice_file: Joi.string().max(500).optional().allow(null, ""),
      accounts_file: Joi.string().max(500).optional().allow(null, ""),
      discount: Joi.number().precision(2).min(0).default(0.0),
      adjustment: Joi.number().precision(2).default(0.0),
      tax: Joi.number().precision(2).min(0).default(0.0),
      items: Joi.array().items(purchaseEntryItemSchema).optional(),
    });

    // Update Schema (all fields optional)
    const updatePurchaseEntrySchema = Joi.object({
      purchase_order_id: Joi.number().integer().min(1).optional().allow(null),
      invoice_no: Joi.string().max(255).optional().allow(null, ""),
      invoice_date: Joi.date().optional().allow(null),
      invoice_file: Joi.string().max(500).optional().allow(null, ""),
      accounts_file: Joi.string().max(500).optional().allow(null, ""),
      discount: Joi.number().precision(2).min(0).optional(),
      adjustment: Joi.number().precision(2).optional(),
      tax: Joi.number().precision(2).min(0).optional(),
      items: Joi.array().items(purchaseEntryItemSchema).optional(),
    }).min(1); // At least one field must be provided

    // Create purchase entry
    router.post("/", async (req, res) => {
      try {
        const { error, value } = purchaseEntrySchema.validate(req.body);
        if (error) {
          throw error;
        }

        const { items, ...purchaseEntryData } = value;

        const result = await this.purchaseEntryUsecase.create(
          purchaseEntryData,
          items
        );
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all purchase entries
    router.get("/", async (req, res) => {
      try {
        const result = await this.purchaseEntryUsecase.getAll();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get purchase entry by ID
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid purchase entry id");

        const result = await this.purchaseEntryUsecase.getById(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update purchase entry
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid purchase entry id");

        const { error, value } = updatePurchaseEntrySchema.validate(req.body);
        if (error) {
          throw error;
        }

        const { items, ...purchaseEntryData } = value;

        const result = await this.purchaseEntryUsecase.update(
          id,
          purchaseEntryData,
          items
        );
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete purchase entry
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid purchase entry id");

        const result = await this.purchaseEntryUsecase.delete(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
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

module.exports = (purchaseEntryUsecase) => {
  return new PurchaseEntryRoutes(purchaseEntryUsecase);
};
