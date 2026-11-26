const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class TargetSectionRoutes {
  constructor(usecase, designationsUsecase) {
    this.usecase = usecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    // Create as array: delete existing for month+branch+department then insert all
    router.post("/", async (req, res) => {
      try {
        const itemSchema = Joi.object({
          branch_id: Joi.number().integer().positive().required(),
          department_id: Joi.number().integer().positive().required(),
          section_id: Joi.number().integer().positive().required(),
          target_amount: Joi.number().required(),
          target_date: Joi.date().required(),
        });
        const schema = Joi.array().items(itemSchema).min(1);

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const result = await this.usecase.create(value);
        res.status(200).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all
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

        const result = await this.usecase.getAll(branch_id);
        res.status(200).json(result);
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
          id: parseInt(req.params.id),
        });
        if (error) throw error;

        const result = await this.usecase.getById(value.id);
        res.status(result.code === 200 ? 200 : 404).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Edit
    router.put("/:id", async (req, res) => {
      try {
        const paramsSchema = Joi.object({
          id: Joi.number().integer().positive().required(),
        });
        const bodySchema = Joi.object({
          branch_id: Joi.number().integer().positive(),
          department_id: Joi.number().integer().positive(),
          section_id: Joi.number().integer().positive(),
          target_amount: Joi.number(),
          target_date: Joi.date(),
        }).min(1);

        const params = paramsSchema.validate({ id: parseInt(req.params.id) });
        if (params.error) throw params.error;
        const body = bodySchema.validate(req.body);
        if (body.error) throw body.error;

        const result = await this.usecase.update(params.value.id, body.value);
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

module.exports = (usecase, designationsUsecase) => {
  return new TargetSectionRoutes(usecase, designationsUsecase);
};
