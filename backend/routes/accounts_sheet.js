const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class AccountsSheetRoutes {
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
          employee_id: Joi.string().required(),
          billing_counter_id: Joi.number()
            .integer()
            .positive()
            .allow(null)
            .optional(),
          no_of_bills: Joi.number().integer().min(0).default(0),
          no_of_items: Joi.number().integer().min(0).default(0),
          total_sales: Joi.number().precision(2).min(0).default(0),
          cash_sales: Joi.number().precision(2).min(0).default(0),
          cash_type: Joi.string()
            .valid("excess", "short", "exact")
            .default("exact"),
          cash_reason: Joi.string().allow(null, ""),
          card_sales: Joi.number().precision(2).min(0).default(0),
          card_type: Joi.string()
            .valid("excess", "short", "exact")
            .default("exact"),
          card_reason: Joi.string().allow(null, ""),
          paytm_sales: Joi.number().precision(2).min(0).default(0),
          paytm_type: Joi.string()
            .valid("excess", "short", "exact")
            .default("exact"),
          paytm_reason: Joi.string().allow(null, ""),
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

    router.put("/:id", async (req, res) => {
      try {
        const schema = {
          date: Joi.date(),
          employee_id: Joi.string(),
          billing_counter_id: Joi.number()
            .integer()
            .positive()
            .allow(null)
            .optional(),
          no_of_bills: Joi.number().integer().min(0),
          no_of_items: Joi.number().integer().min(0),
          total_sales: Joi.number().precision(2).min(0),
          cash_sales: Joi.number().precision(2).min(0),
          cash_type: Joi.string().valid("excess", "short", "exact"),
          cash_reason: Joi.string().allow(null, ""),
          card_sales: Joi.number().precision(2).min(0),
          card_type: Joi.string().valid("excess", "short", "exact"),
          card_reason: Joi.string().allow(null, ""),
          paytm_sales: Joi.number().precision(2).min(0),
          paytm_type: Joi.string().valid("excess", "short", "exact"),
          paytm_reason: Joi.string().allow(null, ""),
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

    const listAccountsSheetQuerySchema = Joi.object({
      from_date: Joi.date().optional(),
      to_date: Joi.date().optional(),
    }).unknown(true);

    router.get("/", async (req, res) => {
      try {
        const { error, value } = listAccountsSheetQuerySchema.validate(
          req.query
        );
        if (error) {
          throw error;
        }

        let branch_id = req.decoded.branch_id;

        const isAllBranchAllowedRes =
          await this.designationsUsecase.checkPermissions(
            req.decoded.employee_id,
            ["access_all_branches"]
          );

        if (isAllBranchAllowedRes.hasAllPermissions) {
          branch_id = null;
        }

        const filters = {};
        if (value.from_date) {
          filters.from_date = value.from_date;
        }
        if (value.to_date) {
          filters.to_date = value.to_date;
        }

        const resp = await this.usecase.getAll(branch_id, filters);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:id", async (req, res) => {
      try {
        const resp = await this.usecase.getById(req.params.id);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:id", async (req, res) => {
      try {
        const resp = await this.usecase.delete(req.params.id);
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
  return new AccountsSheetRoutes(usecase, designationsUsecase);
};
