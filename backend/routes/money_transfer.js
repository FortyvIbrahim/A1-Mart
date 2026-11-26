const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class MoneyTransferRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    router.post("/", async (req, res) => {
      try {
        const schema = {
          from_branch_id: Joi.number().integer().positive().required(),
          to_branch_id: Joi.number().integer().positive().required(),
          amount: Joi.number().precision(2).min(0).required(),
          account_asset_id: Joi.number().integer().positive().required(),
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

    router.put("/:money_transfer_id", async (req, res) => {
      try {
        const schema = {
          from_branch_id: Joi.number().integer().positive(),
          to_branch_id: Joi.number().integer().positive(),
          amount: Joi.number().precision(2).min(0),
          account_asset_id: Joi.number().integer().positive(),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const money_transfer_id = parseInt(req.params.money_transfer_id, 10);
        const resp = await this.usecase.update(money_transfer_id, req.body);
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

    router.get("/:money_transfer_id", async (req, res) => {
      try {
        const money_transfer_id = parseInt(req.params.money_transfer_id, 10);
        const resp = await this.usecase.getById(money_transfer_id);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:money_transfer_id", async (req, res) => {
      try {
        const money_transfer_id = parseInt(req.params.money_transfer_id, 10);
        const resp = await this.usecase.delete(money_transfer_id);
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
  return new MoneyTransferRoutes(usecase);
};
