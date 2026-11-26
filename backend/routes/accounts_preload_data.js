const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class AccountsPreloadDataRoutes {
  constructor(usecase, designationsUsecase) {
    this.usecase = usecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    router.post("/", async (req, res) => {
      try {
        const schema = {
          date: Joi.date().required(),
          billing_counter_id: Joi.number()
            .integer()
            .positive()
            .allow(null)
            .optional(),
          branch_id: Joi.number().integer().positive().required(),
          no_of_bills: Joi.number().integer().min(0).default(0),
          no_of_items: Joi.number().min(0).default(0),
          total_sales: Joi.number().precision(2).min(0).default(0),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.create(req.body);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.post("/bulk", async (req, res) => {
      try {
        const itemSchema = {
          date: Joi.date().required(),
          billing_counter_id: Joi.number()
            .integer()
            .positive()
            .allow(null)
            .optional(),
          branch_id: Joi.number().integer().positive().required(),
          no_of_bills: Joi.number().integer().min(0).default(0),
          no_of_items: Joi.number().min(0).default(0),
          total_sales: Joi.number().precision(2).min(0).default(0),
        };

        const schema = Joi.array().items(itemSchema).min(1).required();
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.bulkCreate(req.body);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/by-date", async (req, res) => {
      try {
        const schema = {
          date: Joi.date().required(),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.deleteAllByDate(req.body.date);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.put("/:id", async (req, res) => {
      try {
        const schema = {
          date: Joi.date(),
          billing_counter_id: Joi.number()
            .integer()
            .positive()
            .allow(null)
            .optional(),
          branch_id: Joi.number().integer().positive(),
          no_of_bills: Joi.number().integer().min(0),
          no_of_items: Joi.number().min(0),
          total_sales: Joi.number().precision(2).min(0),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.update(req.params.id, req.body);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/", async (req, res) => {
      try {
        let branch_id = req.decoded.branch_id;

        const isAllBranchAllowedRes =
          await this.designationsUsecase.checkPermissions(
            req.decoded.employee_id,
            ["access_all_branches"]
          );

        if (isAllBranchAllowedRes.hasAllPermissions) {
          branch_id = null;
        }

        const resp = await this.usecase.getAll(branch_id);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:id", async (req, res) => {
      try {
        const schema = Joi.object({
          id: Joi.number().integer().positive().required(),
        });
        const { error, value } = schema.validate({
          id: parseInt(req.params.id),
        });
        if (error) {
          throw error;
        }

        const resp = await this.usecase.getById(value.id);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:id", async (req, res) => {
      try {
        const schema = Joi.object({
          id: Joi.number().integer().positive().required(),
        });
        const { error, value } = schema.validate({
          id: parseInt(req.params.id),
        });
        if (error) {
          throw error;
        }

        const resp = await this.usecase.delete(value.id);
        res.json({ code: 200, data: resp });
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
  return new AccountsPreloadDataRoutes(usecase, designationsUsecase);
};
