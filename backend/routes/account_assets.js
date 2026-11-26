const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class AccountAssetsRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    router.post("/", async (req, res) => {
      try {
        const schema = {
          label: Joi.string().max(255).required(),
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

    router.put("/:account_asset_id", async (req, res) => {
      try {
        const schema = {
          label: Joi.string().max(255),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.update(
          parseInt(req.params.account_asset_id, 10),
          req.body
        );
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

    router.get("/:account_asset_id", async (req, res) => {
      try {
        const resp = await this.usecase.getById(
          parseInt(req.params.account_asset_id, 10)
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:account_asset_id", async (req, res) => {
      try {
        const resp = await this.usecase.delete(
          parseInt(req.params.account_asset_id, 10)
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        if (
          err &&
          err.name === "ValidationError" &&
          err.appCode === "ACCOUNT_ASSET_IN_USE"
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
  }

  getRouter() {
    return router;
  }
}

module.exports = (usecase) => {
  return new AccountAssetsRoutes(usecase);
};
