const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

const stockItemSchema = Joi.object({
  branch_id: Joi.number().integer().required(),
  qty: Joi.number().integer().min(0).required(),
});

const itemSchema = Joi.object({
  product_id: Joi.number().integer().required(),
  qty: Joi.number().integer().min(0).required(),
  mrp: Joi.number().precision(2).allow(null).optional(),
  net_cost: Joi.number().precision(2).allow(null).optional(),
  stock_array: Joi.array().items(stockItemSchema).default([]),
});

const headerSchema = Joi.object({
  po_id: Joi.number().integer().min(1).allow(null).optional(),
  raised_date: Joi.date().allow(null).optional(),
  buyer_id: Joi.string().max(50).required(),
  supplier_id: Joi.number().integer().required(),
});

const createSchema = Joi.object({
  po_id: Joi.number().integer().min(1).allow(null).optional(),
  raised_date: Joi.date().allow(null).optional(),
  buyer_id: Joi.string().max(50).required(),
  supplier_id: Joi.number().integer().required(),
  items: Joi.array().items(itemSchema).default([]),
});

const updateSchema = Joi.object({
  raised_date: Joi.date().allow(null).optional(),
  buyer_id: Joi.string().max(50).optional(),
  supplier_id: Joi.number().integer().optional(),
  items: Joi.array().items(itemSchema).optional(),
}).min(1);

class PoRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    router.post("/", async (req, res) => {
      try {
        const { error, value } = createSchema.validate(req.body);
        if (error) throw error;
        const { items = [], ...header } = value;
        const result = await this.usecase.create(header, items);
        const status = result.code === 200 ? 201 : result.code === 409 ? 409 : 400;
        res.status(status).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/", async (_req, res) => {
      try {
        const result = await this.usecase.getAll();
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid po_id");
        const result = await this.usecase.getById(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid po_id");
        const { error, value } = updateSchema.validate(req.body);
        if (error) throw error;
        const { items, ...header } = value;
        const result = await this.usecase.update(id, header, items);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid po_id");
        const result = await this.usecase.delete(id);
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

module.exports = (usecase) => {
  return new PoRoutes(usecase);
};
