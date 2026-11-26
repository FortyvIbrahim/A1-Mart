const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class EmployeeSalesRoutes {
  constructor(usecase, designationsUsecase) {
    this.usecase = usecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    // Create/Upsert single entry
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          date: Joi.date().required(),
          sales_amount: Joi.number().integer().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        value.employee_code = req.decoded.employee_id;

        const result = await this.usecase.create(value);
        res.status(200).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all (with optional filters)
    router.get("/", async (req, res) => {
      try {
        const schema = Joi.object({
          employee_code: Joi.string(),
          from_date: Joi.date(),
          to_date: Joi.date(),
        });
        const { error, value } = schema.validate(req.query);
        if (error) throw error;

        let branch_id = req.decoded.branch_id;
        const isAllBranchAllowedRes =
          await this.designationsUsecase.checkPermissions(
            req.decoded.employee_id,
            ["access_all_branches"]
          );
        if (isAllBranchAllowedRes.hasAllPermissions) {
          branch_id = null;
        }

        const result = await this.usecase.getAll({ ...value, branch_id });
        res.status(200).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get by composite id (employee_code, date)
    router.get("/:employee_code/:date", async (req, res) => {
      try {
        const schema = Joi.object({
          employee_code: Joi.string().required(),
          date: Joi.date().required(),
        });
        const { error, value } = schema.validate({
          employee_code: req.params.employee_code,
          date: req.params.date,
        });
        if (error) throw error;

        const result = await this.usecase.getById(
          value.date,
          value.employee_code
        );
        res.status(result.code === 200 ? 200 : 404).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete by composite id (employee_code, date)
    router.delete("/:employee_code/:date", async (req, res) => {
      try {
        const schema = Joi.object({
          employee_code: Joi.string().required(),
          date: Joi.date().required(),
        });
        const { error, value } = schema.validate({
          employee_code: req.params.employee_code,
          date: req.params.date,
        });
        if (error) throw error;

        const result = await this.usecase.delete(
          value.date,
          value.employee_code
        );
        res.status(200).json(result);
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
  return new EmployeeSalesRoutes(usecase, designationsUsecase);
};
