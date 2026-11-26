const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class EmployeeSectionsRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    router.post("/bulk", async (req, res) => {
      try {
        const schema = Joi.array().items(
          Joi.object({
            section_name: Joi.string().required(),
            section_code: Joi.string().required(),
            is_active: Joi.boolean().default(true),
          })
        );
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.bulkCreate(req.body);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.post("/", async (req, res) => {
      try {
        const schema = {
          section_name: Joi.string().required(),
          section_code: Joi.string().required(),
          is_active: Joi.boolean().default(true),
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
          section_name: Joi.string(),
          section_code: Joi.string(),
          is_active: Joi.boolean(),
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

    router.get("/", async (_req, res) => {
      try {
        const resp = await this.usecase.getAll();
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/by-branch/:branch_id/:department_id", async (req, res) => {
      try {
        const schema = Joi.object({
          branch_id: Joi.number().integer().required(),
          department_id: Joi.number().integer().required(),
        });
        const { error, value } = schema.validate({
          branch_id: parseInt(req.params.branch_id, 10),
          department_id: parseInt(req.params.department_id, 10),
        });
        if (error) throw error;

        const rows = await this.usecase.getByBranchAndDepartmentUsingEmployees(
          value.branch_id,
          value.department_id
        );
        res.json({ code: 200, data: rows });
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

module.exports = (usecase) => {
  return new EmployeeSectionsRoutes(usecase);
};
