const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class PurchaseOrderRoutes {
  constructor(purchaseOrderUsecase) {
    this.purchaseOrderUsecase = purchaseOrderUsecase;
    this.init();
  }

  init() {
    // Purchase Order Item Schema
    const purchaseOrderItemSchema = Joi.object({
      material_id: Joi.number().required(),
      quantity: Joi.number().integer().min(1).required(),
      rate: Joi.number().precision(2).min(0).required(),
    });

    // Purchase Order Schema
    const purchaseOrderSchema = Joi.object({
      purchase_order_id: Joi.number().integer().min(1).optional(),
      purchase_order_ref: Joi.string().max(255).optional().allow(null),
      vendor_id: Joi.number().required(),
      date: Joi.date().optional().allow(null),
      delivery_date: Joi.date().optional().allow(null),
      discount: Joi.number().precision(2).min(0).default(0.0),
      adjustment: Joi.number().precision(2).default(0.0),
      tax: Joi.number().precision(2).min(0).default(0.0),
      status: Joi.string()
        .valid("raised", "approved", "purchased")
        .default("raised"),
      items: Joi.array().items(purchaseOrderItemSchema).optional(),
      should_generate_pdf: Joi.boolean().optional().default(false),
    });

    // Update Schema (all fields optional except items)
    const updatePurchaseOrderSchema = Joi.object({
      purchase_order_ref: Joi.string().max(255).optional().allow(null),
      vendor_id: Joi.number().optional(),
      date: Joi.date().optional().allow(null),
      delivery_date: Joi.date().optional().allow(null),
      discount: Joi.number().precision(2).min(0).optional(),
      adjustment: Joi.number().precision(2).optional(),
      tax: Joi.number().precision(2).min(0).optional(),
      status: Joi.string().valid("raised", "approved", "purchased").optional(),
      items: Joi.array().items(purchaseOrderItemSchema).optional(),
      should_generate_pdf: Joi.boolean().optional().default(false),
    }).min(1); // At least one field must be provided

    // Create purchase order
    router.post("/", async (req, res) => {
      try {
        const { error, value } = purchaseOrderSchema.validate(req.body);
        if (error) {
          throw error;
        }

        const { items, should_generate_pdf, ...purchaseOrderData } = value;

        const result = await this.purchaseOrderUsecase.create(
          purchaseOrderData,
          items,
          should_generate_pdf
        );
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all purchase orders
    router.get("/", async (req, res) => {
      try {
        const result = await this.purchaseOrderUsecase.getAll();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get purchase order by ID
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid purchase order id");

        const result = await this.purchaseOrderUsecase.getById(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update purchase order
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid purchase order id");

        const { error, value } = updatePurchaseOrderSchema.validate(req.body);
        if (error) {
          throw error;
        }

        const { items, should_generate_pdf, ...purchaseOrderData } = value;

        const result = await this.purchaseOrderUsecase.update(
          id,
          purchaseOrderData,
          items,
          should_generate_pdf
        );
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete purchase order
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid purchase order id");

        const result = await this.purchaseOrderUsecase.delete(id);
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

module.exports = (purchaseOrderUsecase) => {
  return new PurchaseOrderRoutes(purchaseOrderUsecase);
};
