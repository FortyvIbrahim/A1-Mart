const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class DesignationsRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    router.post("/bulk", async (req, res) => {
      try {
        const schema = Joi.array().items(
          Joi.object({
            designation_name: Joi.string().required(),
            designation_code: Joi.string().required(),
            is_active: Joi.boolean().default(true),
            requires_2fa: Joi.boolean().default(false),
            incentive_type: Joi.string().max(50).allow(null, "").optional(),
            working_days: Joi.number().integer().min(0).allow(null).optional(),
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
          designation_name: Joi.string().required(),
          designation_code: Joi.string().required(),
          is_active: Joi.boolean().default(true),
          requires_2fa: Joi.boolean().default(false),
          incentive_type: Joi.string().max(50).allow(null, "").optional(),
          working_days: Joi.number().integer().min(0).allow(null).optional(),
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
          designation_name: Joi.string(),
          designation_code: Joi.string(),
          is_active: Joi.boolean(),
          requires_2fa: Joi.boolean(),
          incentive_type: Joi.string().max(50).allow(null, "").optional(),
          working_days: Joi.number().integer().min(0).allow(null).optional(),
          permissions: Joi.array().items(Joi.string()).default([]),
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

    router.post("/check-permissions", async (req, res) => {
      try {
        const schema = {
          permission_keys: Joi.array().items(Joi.string()).required(),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        if (!req.decoded || !req.decoded.employee_id) {
          res.json({ code: 401, msg: "Access Denied" });
          res.end();
          return;
        }

        const resp = await this.usecase.checkPermissions(
          req.decoded.employee_id,
          req.body.permission_keys
        );
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
  return new DesignationsRoutes(usecase);
};
