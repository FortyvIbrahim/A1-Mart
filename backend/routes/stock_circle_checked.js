const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class StockCircleCheckedRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    // Create/Update stock circle checked (upsert)
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          stock_circle_id: Joi.number().integer().required(),
          product_id: Joi.number().integer().required(),
          checked_stock: Joi.number().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        value.created_by = req.decoded.employee_id;

        const result = await this.usecase.create(value);
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Bulk create/update stock circles checked
    router.post("/bulk", async (req, res) => {
      try {
        const schema = Joi.array().items(
          Joi.object({
            stock_circle_id: Joi.number().integer().required(),
            product_id: Joi.number().integer().required(),
            checked_stock: Joi.number().required(),
          })
        );

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        // Add created_by to all rows
        const rowsWithCreatedBy = value.map((row) => ({
          ...row,
          created_by: req.decoded.employee_id,
        }));

        const result = await this.usecase.bulkCreate(rowsWithCreatedBy);
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all stock circles checked (optionally filtered by stock_circle_id)
    router.get("/", async (req, res) => {
      try {
        const stockCircleId = req.query.stock_circle_id
          ? parseInt(req.query.stock_circle_id)
          : null;

        if (req.query.stock_circle_id && isNaN(stockCircleId)) {
          throw new Error("Invalid stock_circle_id");
        }

        const result = await this.usecase.getAll(stockCircleId);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get stock circle checked by ID (stock_circle_id and product_id)
    router.get("/:stockCircleId(\\d+)/:productId(\\d+)", async (req, res) => {
      try {
        const stockCircleId = parseInt(req.params.stockCircleId);
        const productId = parseInt(req.params.productId);

        if (isNaN(stockCircleId) || isNaN(productId)) {
          throw new Error("Invalid stock_circle_id or product_id");
        }

        const result = await this.usecase.getById(stockCircleId, productId);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update stock circle checked
    router.put("/:stockCircleId(\\d+)/:productId(\\d+)", async (req, res) => {
      try {
        const stockCircleId = parseInt(req.params.stockCircleId);
        const productId = parseInt(req.params.productId);

        if (isNaN(stockCircleId) || isNaN(productId)) {
          throw new Error("Invalid stock_circle_id or product_id");
        }

        const schema = Joi.object({
          checked_stock: Joi.number().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.update(
          stockCircleId,
          productId,
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

    // Delete stock circle checked
    router.delete(
      "/:stockCircleId(\\d+)/:productId(\\d+)",
      async (req, res) => {
        try {
          const stockCircleId = parseInt(req.params.stockCircleId);
          const productId = parseInt(req.params.productId);

          if (isNaN(stockCircleId) || isNaN(productId)) {
            throw new Error("Invalid stock_circle_id or product_id");
          }

          const result = await this.usecase.delete(stockCircleId, productId);
          res
            .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
            .json(result);
        } catch (err) {
          respondError(res, err);
        }
        res.end();
      }
    );
  }

  getRouter() {
    return router;
  }
}

module.exports = (usecase) => {
  return new StockCircleCheckedRoutes(usecase);
};
