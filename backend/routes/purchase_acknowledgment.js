const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class PurchaseAcknowledgmentRoutes {
  constructor(purchaseAcknowledgmentUsecase) {
    this.purchaseAcknowledgmentUsecase = purchaseAcknowledgmentUsecase;
    this.init();
  }

  init() {
    // Purchase Acknowledgment Schema
    const purchaseAcknowledgmentSchema = Joi.object({
      supplier_id: Joi.number().integer().required(),
      invoice_no: Joi.string().max(255).required(),
      invoice_date: Joi.date().required(),
      amount: Joi.number().precision(2).min(0).required(),
    });

    // Update Schema (all fields optional)
    const updatePurchaseAcknowledgmentSchema = Joi.object({
      supplier_id: Joi.number().integer().allow(null).optional(),
      invoice_no: Joi.string().max(255).allow(null).optional(),
      invoice_date: Joi.date().allow(null).optional(),
      amount: Joi.number().precision(2).min(0).optional(),
    }).min(1); // At least one field must be provided

    // Create purchase acknowledgment
    router.post("/", async (req, res) => {
      try {
        const { error, value } = purchaseAcknowledgmentSchema.validate(
          req.body
        );
        if (error) {
          throw error;
        }

        value.branch_id = req.decoded.branch_id;
        const result = await this.purchaseAcknowledgmentUsecase.create(value);
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    const listPurchaseAcknowledgmentQuerySchema = Joi.object({
      from: Joi.date().optional(),
      to: Joi.date().optional(),
    }).unknown(true);

    // Get all purchase acknowledgments
    router.get("/", async (req, res) => {
      try {
        const { error, value } = listPurchaseAcknowledgmentQuerySchema.validate(
          req.query
        );
        if (error) {
          throw error;
        }
        const filters = {};
        if (value.from) filters.from = value.from;
        if (value.to) filters.to = value.to;
        const result = await this.purchaseAcknowledgmentUsecase.getAll(filters);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get purchase acknowledgment by ID
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid purchase acknowledgment id");

        const result = await this.purchaseAcknowledgmentUsecase.getById(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update purchase acknowledgment
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid purchase acknowledgment id");

        const { error, value } = updatePurchaseAcknowledgmentSchema.validate(
          req.body
        );
        if (error) {
          throw error;
        }

        const result = await this.purchaseAcknowledgmentUsecase.update(
          id,
          value
        );
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete purchase acknowledgment
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid purchase acknowledgment id");

        const result = await this.purchaseAcknowledgmentUsecase.delete(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get purchase entry items by product_id (with invoice/supplier info)
    router.get("/by-product/:product_id(\\d+)", async (req, res) => {
      try {
        const product_id = parseInt(req.params.product_id);
        if (isNaN(product_id)) throw new Error("Invalid product_id");

        const result =
          await this.purchaseAcknowledgmentUsecase.getEntriesByProductId(
            product_id
          );
        res.status(result.code === 200 ? 200 : 400).json(result);
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

module.exports = (purchaseAcknowledgmentUsecase) => {
  return new PurchaseAcknowledgmentRoutes(purchaseAcknowledgmentUsecase);
};
