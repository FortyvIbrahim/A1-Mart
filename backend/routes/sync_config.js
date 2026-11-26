const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

const syncKeyParam = Joi.string().max(100).regex(/^[a-zA-Z0-9_-]+$/);

const updateBodySchema = Joi.object({
  cron: Joi.string().max(100).trim().optional(),
  is_active: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().valid(0, 1))
    .optional(),
}).or("cron", "is_active");

class SyncConfigRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    router.get("/", async (req, res) => {
      try {
        const rows = await this.usecase.getAll();
        res.json({ code: 200, data: rows });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:sync_key", async (req, res) => {
      try {
        const { error, value } = syncKeyParam.validate(req.params.sync_key);
        if (error) throw error;
        const row = await this.usecase.getBySyncKey(value);
        if (!row) {
          res.status(404).json({ code: 404, msg: "Unknown sync_key" });
        } else {
          res.json({ code: 200, data: row });
        }
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    const handleUpdate = async (req, res) => {
      try {
        const { error: keyErr, value: sync_key } = syncKeyParam.validate(
          req.params.sync_key
        );
        if (keyErr) throw keyErr;

        const { error: bodyErr, value: body } = updateBodySchema.validate(
          req.body,
          { stripUnknown: true }
        );
        if (bodyErr) throw bodyErr;

        const result = await this.usecase.update(sync_key, body);
        const status = result.code === 200 ? 200 : result.code;
        res.status(status).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    };

    router.patch("/:sync_key", handleUpdate);
    router.put("/:sync_key", handleUpdate);
  }

  getRouter() {
    return router;
  }
}

module.exports = (usecase) => new SyncConfigRoutes(usecase);
