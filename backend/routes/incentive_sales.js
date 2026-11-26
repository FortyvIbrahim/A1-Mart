const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class IncentiveSalesRoutes {
  constructor(incentiveSalesUsecase) {
    this.incentiveSalesUsecase = incentiveSalesUsecase;
    this.init();
  }

  init() {
    // Range schema for validation
    const rangeSchema = Joi.object({
      start: Joi.number().allow(null).optional(),
      end: Joi.number().allow(null).optional(),
      start_operator: Joi.string()
        .valid("more_than", "none")
        .required(),
      end_operator: Joi.string()
        .valid("less_than", "none")
        .required(),
      percentage: Joi.number().min(0).max(100).optional(),
      fixed: Joi.number().min(0).optional(),
    });

    // Create schema
    const createSchema = Joi.object({
      cluster_type: Joi.string()
        .valid("small", "medium", "large")
        .required(),
      incentive_type: Joi.string()
        .valid(
          "single_percentage",
          "ranged_percentage",
          "fixed",
          "ranged_fixed"
        )
        .required(),
      value: Joi.number().min(0).allow(null).optional(),
      ranges: Joi.array().items(rangeSchema).allow(null).optional(),
      selected_month: Joi.date().allow(null).optional(),
    });

    // Update schema (all fields optional)
    const updateSchema = Joi.object({
      cluster_type: Joi.string()
        .valid("small", "medium", "large")
        .optional(),
      incentive_type: Joi.string()
        .valid(
          "single_percentage",
          "ranged_percentage",
          "fixed",
          "ranged_fixed"
        )
        .optional(),
      value: Joi.number().min(0).allow(null).optional(),
      ranges: Joi.array().items(rangeSchema).allow(null).optional(),
      selected_month: Joi.date().allow(null).optional(),
    }).min(1); // At least one field must be provided

    // Create incentive sales
    router.post("/", async (req, res) => {
      try {
        const { error, value } = createSchema.validate(req.body);
        if (error) {
          throw error;
        }

        // Custom validation based on incentive_type
        if (
          value.incentive_type === "single_percentage" ||
          value.incentive_type === "fixed"
        ) {
          if (value.value === null || value.value === undefined) {
            throw new Error(
              `value is required for ${value.incentive_type}`
            );
          }
          if (value.ranges !== null && value.ranges !== undefined) {
            throw new Error(
              `ranges must be null for ${value.incentive_type}`
            );
          }
        } else if (
          value.incentive_type === "ranged_percentage" ||
          value.incentive_type === "ranged_fixed"
        ) {
          if (!value.ranges || value.ranges.length === 0) {
            throw new Error(
              `ranges is required for ${value.incentive_type}`
            );
          }
          if (value.value !== null && value.value !== undefined) {
            throw new Error(
              `value must be null for ${value.incentive_type}`
            );
          }
          // Validate range fields based on incentive_type
          for (const range of value.ranges) {
            if (value.incentive_type === "ranged_percentage") {
              if (
                range.percentage === null ||
                range.percentage === undefined
              ) {
                throw new Error(
                  "percentage is required in ranges for ranged_percentage"
                );
              }
            } else if (value.incentive_type === "ranged_fixed") {
              if (range.fixed === null || range.fixed === undefined) {
                throw new Error(
                  "fixed is required in ranges for ranged_fixed"
                );
              }
            }
          }
        }

        const result = await this.incentiveSalesUsecase.create(value);
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all incentive sales records
    router.get("/", async (req, res) => {
      try {
        const querySchema = Joi.object({
          cluster_type: Joi.string()
            .valid("small", "medium", "large")
            .optional(),
          month: Joi.date().allow(null).optional(),
        });

        const { error, value } = querySchema.validate(req.query);
        if (error) {
          throw error;
        }

        const result = await this.incentiveSalesUsecase.getAll(
          value.cluster_type,
          value.month
        );
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get incentive sales by ID
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid incentive sales id");

        const result = await this.incentiveSalesUsecase.getById(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update incentive sales
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid incentive sales id");

        const { error, value } = updateSchema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.incentiveSalesUsecase.update(id, value);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete incentive sales
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid incentive sales id");

        const result = await this.incentiveSalesUsecase.delete(id);
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

module.exports = (incentiveSalesUsecase) => {
  return new IncentiveSalesRoutes(incentiveSalesUsecase);
};
