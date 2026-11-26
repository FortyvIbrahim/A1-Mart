const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class StockCirclesRoutes {
  constructor(usecase, designationsUsecase) {
    this.usecase = usecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    // Create stock circle
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          department_ids: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .required(),
          category_id: Joi.number().integer().allow(null).optional(),
          subcategory_id: Joi.number().integer().allow(null).optional(),
          branch_id: Joi.number().integer().required(),
          period_type: Joi.string()
            .valid(
              "yearly",
              "biyearly",
              "quarterly",
              "monthly",
              "daily",
              "term"
            )
            .required(),
          period: Joi.string().max(255).allow(null, "").optional(),
          period_start_date: Joi.date().allow(null).optional(),
          period_end_date: Joi.date().allow(null).optional(),
          is_active: Joi.boolean().default(true).optional(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.create(value);
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all stock circles
    router.get("/", async (req, res) => {
      try {
        let branchId = req.decoded?.branch_id || null;

        if (branchId && this.designationsUsecase) {
          const isAllBranchAllowedRes =
            await this.designationsUsecase.checkPermissions(
              req.decoded.employee_id,
              ["access_all_branches"]
            );

          if (isAllBranchAllowedRes.hasAllPermissions) {
            branchId = null;
          }
        }

        const result = await this.usecase.getAll(branchId);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get stock circle by ID
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid stock circle id");

        const result = await this.usecase.getById(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update stock circle
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid stock circle id");

        const schema = Joi.object({
          department_ids: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .optional(),
          category_id: Joi.number().integer().allow(null).optional(),
          subcategory_id: Joi.number().integer().allow(null).optional(),
          branch_id: Joi.number().integer().optional(),
          period_type: Joi.string()
            .valid(
              "yearly",
              "biyearly",
              "quarterly",
              "monthly",
              "daily",
              "term"
            )
            .optional(),
          period: Joi.string().max(255).allow(null, "").optional(),
          period_start_date: Joi.date().allow(null).optional(),
          period_end_date: Joi.date().allow(null).optional(),
          is_active: Joi.boolean().optional(),
        }).min(1); // At least one field must be provided

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.update(id, value);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete stock circle
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid stock circle id");

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

module.exports = (usecase, designationsUsecase) => {
  return new StockCirclesRoutes(usecase, designationsUsecase);
};
