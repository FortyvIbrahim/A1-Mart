const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class EmployeeAllocationRoutes {
  constructor(usecase, designationsUsecase) {
    this.usecase = usecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    // Create
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          branch_id: Joi.number().integer().positive().required(),
          designation_id: Joi.number().integer().positive().required(),
          required_count: Joi.number().integer().min(0).required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const result = await this.usecase.create(value);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        if (
          err &&
          err.name === "ValidationError" &&
          err.appCode === "EMPLOYEE_ALLOCATION_DUPLICATE"
        ) {
          res.status(422).json({
            code: 422,
            app_code: err.appCode,
            msg: err.message,
          });
        } else {
          respondError(res, err);
        }
      }
      res.end();
    });

    // Get all
    router.get("/", async (req, res) => {
      try {
        let branch_id = req.decoded.branch_id;

        const permRes = await this.designationsUsecase.checkPermissions(
          req.decoded.employee_id,
          ["access_all_branches"]
        );

        if (permRes.hasAllPermissions) {
          branch_id = null;
        }

        const result = await this.usecase.getAll(branch_id);
        res
          .status(result.code === 200 ? 200 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get by id
    router.get("/:id", async (req, res) => {
      try {
        const schema = Joi.object({
          id: Joi.number().integer().positive().required(),
        });
        const { error, value } = schema.validate({
          id: parseInt(req.params.id, 10),
        });
        if (error) throw error;

        const result = await this.usecase.getById(value.id);
        res
          .status(result.code === 200 ? 200 : 404)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update
    router.put("/:id", async (req, res) => {
      try {
        const paramsSchema = Joi.object({
          id: Joi.number().integer().positive().required(),
        });
        const bodySchema = Joi.object({
          branch_id: Joi.number().integer().positive(),
          designation_id: Joi.number().integer().positive(),
          required_count: Joi.number().integer().min(0),
        }).min(1);

        const paramsValidation = paramsSchema.validate({
          id: parseInt(req.params.id, 10),
        });
        if (paramsValidation.error) throw paramsValidation.error;

        const bodyValidation = bodySchema.validate(req.body);
        if (bodyValidation.error) throw bodyValidation.error;

        const result = await this.usecase.update(
          paramsValidation.value.id,
          bodyValidation.value
        );
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        if (
          err &&
          err.name === "ValidationError" &&
          err.appCode === "EMPLOYEE_ALLOCATION_DUPLICATE"
        ) {
          res.status(422).json({
            code: 422,
            app_code: err.appCode,
            msg: err.message,
          });
        } else {
          respondError(res, err);
        }
      }
      res.end();
    });

    // Delete
    router.delete("/:id", async (req, res) => {
      try {
        const schema = Joi.object({
          id: Joi.number().integer().positive().required(),
        });
        const { error, value } = schema.validate({
          id: parseInt(req.params.id, 10),
        });
        if (error) throw error;

        const result = await this.usecase.delete(value.id);
        res
          .status(
            result.code === 200 ? 200 : result.code === 404 ? 404 : 400
          )
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
  return new EmployeeAllocationRoutes(usecase, designationsUsecase);
};

