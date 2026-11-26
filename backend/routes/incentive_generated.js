const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class IncentiveGeneratedRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    // ---------- Validation schemas ----------
    const headerSchema = Joi.object({
      start_date: Joi.date().required(),
      end_date: Joi.date().required(),
      branch_id: Joi.number().integer().allow(null).optional(),
      designation_id: Joi.alternatives()
        .try(
          Joi.array().items(Joi.number().integer()).allow(null),
          Joi.number().integer().allow(null)
        )
        .optional(),
      incentive_type: Joi.string().max(50).allow(null).optional(),
      status: Joi.string()
        .valid("approved", "cancelled", "unapproved")
        .default("unapproved")
        .optional(),
    });

    const itemSchema = Joi.object({
      employee_code: Joi.string().required(),
      incentive: Joi.number().precision(2).required(),
      extra_data: Joi.object().unknown(true).allow(null).optional(),
    });

    // ---------- Header CRUD ----------

    // Create header (optionally with items)
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          header: headerSchema.required(),
          items: Joi.array().items(itemSchema).optional(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.createHeader(
          value.header,
          value.items || []
        );
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all headers
    router.get("/", async (_req, res) => {
      try {
        const result = await this.usecase.getAllHeaders();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get incentive items for a month/year (one per employee, latest updated)
    router.get("/by-month", async (req, res) => {
      try {
        const querySchema = Joi.object({
          month: Joi.number().integer().min(1).max(12).required(),
          year: Joi.number().integer().min(2000).max(2100).required(),
        });
        const { error, value } = querySchema.validate(req.query);
        if (error) {
          throw error;
        }
        const result = await this.usecase.getItemsByMonthYear(
          value.month,
          value.year
        );
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get single header + items by id
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          throw new Error("Invalid incentive_generated_id");
        }

        const result = await this.usecase.getById(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update header (and optionally items)
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          throw new Error("Invalid incentive_generated_id");
        }

        const schema = Joi.object({
          header: headerSchema.optional(),
          items: Joi.array().items(itemSchema).optional(),
        }).min(1);

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.updateHeader(
          id,
          value.header || {},
          value.items
        );
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete header (and cascaded items)
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          throw new Error("Invalid incentive_generated_id");
        }

        const result = await this.usecase.deleteHeader(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // ---------- Items-only operations ----------

    // Upsert items for a given incentive_generated_id
    router.post("/:id(\\d+)/items", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          throw new Error("Invalid incentive_generated_id");
        }

        const schema = Joi.array().items(itemSchema).min(1);
        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.upsertItems(id, value);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete single item by employee_code
    router.delete("/:id(\\d+)/items/:employee_code", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          throw new Error("Invalid incentive_generated_id");
        }

        const employee_code = req.params.employee_code;
        if (!employee_code) {
          throw new Error("employee_code is required");
        }

        const result = await this.usecase.deleteItem(id, employee_code);
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
  return new IncentiveGeneratedRoutes(usecase);
};

