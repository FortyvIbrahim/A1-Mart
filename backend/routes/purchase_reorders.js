const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

const itemSchema = Joi.object({
  product_id: Joi.number().integer().required(),
  qty: Joi.number().min(0).required(),
  mrp: Joi.number().allow(null).optional(),
  cost_price: Joi.number().allow(null).optional(),
  discount: Joi.number().allow(null).optional(),
  order_worth: Joi.number().allow(null).optional(),
  tax_amount: Joi.number().allow(null).optional(),
  buyer_id: Joi.string().max(50).required(),
  supplier_id: Joi.number().integer().required(),
});

class PurchaseReordersRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    router.post("/", async (req, res) => {
      try {
        const { error, value } = itemSchema.validate(req.body);
        if (error) throw error;
        const resp = await this.usecase.create({
          ...value,
          is_purchased: false,
        });
        res.status(resp.code === 200 ? 201 : 400).json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.post("/bulk", async (req, res) => {
      try {
        const schema = Joi.array().items(itemSchema);
        const { error, value } = schema.validate(req.body);
        if (error) throw error;
        const resp = await this.usecase.bulkUpsert(value);
        res.json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/", async (_req, res) => {
      try {
        const resp = await this.usecase.getAll();
        res.json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid id");
        const resp = await this.usecase.getById(id);
        res
          .status(resp.code === 200 ? 200 : resp.code === 404 ? 404 : 400)
          .json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid id");
        const schema = Joi.object({
          qty: Joi.number().min(0).optional(),
          mrp: Joi.number().allow(null).optional(),
          cost_price: Joi.number().allow(null).optional(),
          discount: Joi.number().allow(null).optional(),
          order_worth: Joi.number().allow(null).optional(),
          tax_amount: Joi.number().allow(null).optional(),
          is_purchased: Joi.boolean().optional(),
        }).min(1);
        const { error, value } = schema.validate(req.body);
        if (error) throw error;
        const resp = await this.usecase.update(id, value);
        res
          .status(resp.code === 200 ? 200 : resp.code === 404 ? 404 : 400)
          .json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid id");
        const resp = await this.usecase.delete(id);
        res
          .status(resp.code === 200 ? 200 : resp.code === 404 ? 404 : 400)
          .json(resp);
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
  return new PurchaseReordersRoutes(usecase);
};
