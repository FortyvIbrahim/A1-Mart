const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class GrnRoutes {
  constructor(grnUsecase) {
    this.grnUsecase = grnUsecase;
    this.init();
  }

  init() {
    // GRN Schema
    const grnSchema = Joi.object({
      purchase_acknowledgment_id: Joi.number().integer().required(),
      employee_id: Joi.string().allow(null).optional(),
      missing_qty: Joi.number().precision(2).allow(null).optional(),
      missing_value: Joi.number().precision(2).allow(null).optional(),
      credit_note_link: Joi.string().max(500).allow(null).optional(),
      purchase_order_id: Joi.number().integer().allow(null).optional(),
      grn_method: Joi.string().valid("device", "manual").allow(null).optional(),
    });

    // Update Schema (all fields optional except purchase_acknowledgment_id cannot be changed)
    const updateGrnSchema = Joi.object({
      employee_id: Joi.string().allow(null).optional(),
      missing_qty: Joi.number().precision(2).allow(null).optional(),
      missing_value: Joi.number().precision(2).allow(null).optional(),
      credit_note_link: Joi.string().max(500).allow(null).optional(),
      purchase_order_id: Joi.number().integer().allow(null).optional(),
      grn_method: Joi.string().valid("device", "manual").allow(null).optional(),
    }).min(1); // At least one field must be provided

    // Create GRN
    router.post("/", async (req, res) => {
      try {
        const { error, value } = grnSchema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.grnUsecase.create(value);
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all GRN records
    router.get("/", async (req, res) => {
      try {
        const result = await this.grnUsecase.getAll();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get GRN by ID
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid GRN id");

        const result = await this.grnUsecase.getById(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get GRN by Purchase Acknowledgment ID
    router.get(
      "/purchase-acknowledgment/:purchaseAckId(\\d+)",
      async (req, res) => {
        try {
          const purchaseAckId = parseInt(req.params.purchaseAckId);
          if (isNaN(purchaseAckId))
            throw new Error("Invalid purchase acknowledgment id");

          const result = await this.grnUsecase.getByPurchaseAcknowledgmentId(
            purchaseAckId
          );
          res
            .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
            .json(result);
        } catch (err) {
          respondError(res, err);
        }
        res.end();
      }
    );

    // Update GRN
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid GRN id");

        const { error, value } = updateGrnSchema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.grnUsecase.update(id, value);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete GRN
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid GRN id");

        const result = await this.grnUsecase.delete(id);
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

module.exports = (grnUsecase) => {
  return new GrnRoutes(grnUsecase);
};
