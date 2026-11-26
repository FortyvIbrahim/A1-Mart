const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class DeadStockReportRoutes {
  constructor(deadStockReportUsecase) {
    this.deadStockReportUsecase = deadStockReportUsecase;
    this.init();
  }

  init() {
    const productSchema = Joi.object({
      product_id: Joi.number().integer().required(),
      branch_id: Joi.number().integer().required(),
      "30_days_stock": Joi.number().required(),
      "30_days_stock_value": Joi.number().required(),
      "90_days_stock": Joi.number().required(),
      "90_days_stock_value": Joi.number().required(),
      "120_days_stock": Joi.number().required(),
      "120_days_stock_value": Joi.number().required(),
      "than_120_days_stock": Joi.number().required(),
      "than_120_days_stock_value": Joi.number().required(),
    });

    const createSchema = Joi.object({
      report_name: Joi.string().max(255).required(),
      date: Joi.date().required(),
      products: Joi.array().items(productSchema).min(1).required(),
    });

    router.post("/", async (req, res) => {
      try {
        const { error, value } = createSchema.validate(req.body);
        if (error) throw error;

        value.created_by = req.decoded.employee_id;

        const result = await this.deadStockReportUsecase.create(value);
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/", async (_req, res) => {
      try {
        const result = await this.deadStockReportUsecase.getAllReports();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/latest", async (req, res) => {
      try {
        const latestSchema = Joi.object({
          date: Joi.date().required(),
        });
        const { error, value } = latestSchema.validate(req.query);
        if (error) throw error;

        const result = await this.deadStockReportUsecase.getReportById(
          value.date
        );
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid dead stock report id");

        const result = await this.deadStockReportUsecase.getById(id);
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
        if (isNaN(id)) throw new Error("Invalid dead stock report id");

        const result = await this.deadStockReportUsecase.delete(id);
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

module.exports = (deadStockReportUsecase) => {
  return new DeadStockReportRoutes(deadStockReportUsecase);
};
