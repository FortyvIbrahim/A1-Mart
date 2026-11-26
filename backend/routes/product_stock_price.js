const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class ProductStockPriceRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    // Bulk upsert product stock/price rows
    router.post("/bulk", async (req, res) => {
      try {
        const schema = Joi.array().items(
          Joi.object({
            product_id: Joi.number().integer().required(),
            branch_id: Joi.number().integer().required(),
            stock: Joi.number().required(),
            cost_price: Joi.number().required(),
            selling_price: Joi.number().required(),
          })
        );

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.bulkUpsert(value);
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

module.exports = (usecase) => {
  return new ProductStockPriceRoutes(usecase);
};
