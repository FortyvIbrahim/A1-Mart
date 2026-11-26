const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class PaymentsRoutes {
  constructor(usecase, designationsUsecase) {
    this.usecase = usecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    router.post("/", async (req, res) => {
      try {
        const itemSchema = Joi.object({
          ledger_id: Joi.number().integer().required(),
          amount: Joi.number().precision(2).required(),
          narration: Joi.string().allow(null, "").optional(),
          file_url: Joi.string().uri().allow(null, "").optional(),
        });

        const schema = Joi.object({
          voucher_date: Joi.date().required(),
          branch_id: Joi.number().integer().allow(null),
          account_asset_id: Joi.number().integer().allow(null),
          items: Joi.array().items(itemSchema).default([]),
        });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const header = {
          voucher_date: value.voucher_date,
          branch_id:
            value.branch_id !== undefined ? value.branch_id : req.decoded.branch_id || null,
          created_by: req.decoded.employee_id,
          account_asset_id: value.account_asset_id !== undefined ? value.account_asset_id : null,
        };

        const resp = await this.usecase.create(header, value.items || []);
        res.json({ code: 200, data: resp });
      } catch (err) {
        if (
          err &&
          err.name === "ValidationError" &&
          err.appCode === "INSUFFICIENT_ACCOUNT_ASSET_BALANCE"
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

    router.put("/:payment_id", async (req, res) => {
      try {
        const itemSchema = Joi.object({
          ledger_id: Joi.number().integer().required(),
          amount: Joi.number().precision(2).required(),
          narration: Joi.string().allow(null, "").optional(),
          file_url: Joi.string().uri().allow(null, "").optional(),
        });

        const schema = Joi.object({
          voucher_date: Joi.date(),
          branch_id: Joi.number().integer().allow(null),
          account_asset_id: Joi.number().integer().allow(null),
          items: Joi.array().items(itemSchema).optional(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const { items, ...header } = value;

        const resp = await this.usecase.update(
          parseInt(req.params.payment_id, 10),
          header,
          items
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        if (
          err &&
          err.name === "ValidationError" &&
          err.appCode === "INSUFFICIENT_ACCOUNT_ASSET_BALANCE"
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

    router.delete("/:payment_id", async (req, res) => {
      try {
        const resp = await this.usecase.delete(
          parseInt(req.params.payment_id, 10),
          req.decoded.employee_id
        );
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

        if (
          isAllBranchAllowedRes.hasAllPermissions ||
          req.query.all_branches === "true"
        ) {
          branch_id = null;
        }

        const resp = await this.usecase.getAll(branch_id);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all payment items (with voucher_date & branch_id)
    router.get("/items", async (req, res) => {
      try {
        let branch_id = req.decoded.branch_id;

        const isAllBranchAllowedRes =
          await this.designationsUsecase.checkPermissions(
            req.decoded.employee_id,
            ["access_all_branches"]
          );

        if (
          isAllBranchAllowedRes.hasAllPermissions ||
          req.query.all_branches === "true"
        ) {
          branch_id = null;
        }

        const resp = await this.usecase.getAllItems(branch_id);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:payment_id", async (req, res) => {
      try {
        const resp = await this.usecase.getById(
          parseInt(req.params.payment_id, 10)
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Items
    router.get("/:payment_id/items", async (req, res) => {
      try {
        const resp = await this.usecase.getItems(
          parseInt(req.params.payment_id, 10)
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.post("/:payment_id/items", async (req, res) => {
      try {
        const itemSchema = Joi.object({
          ledger_id: Joi.number().integer().required(),
          amount: Joi.number().precision(2).required(),
          narration: Joi.string().allow(null, "").optional(),
          file_url: Joi.string().uri().allow(null, "").optional(),
        });

        const schema = Joi.array().items(itemSchema);
        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const resp = await this.usecase.addItems(
          parseInt(req.params.payment_id, 10),
          value
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.put("/items/:payment_item_id", async (req, res) => {
      try {
        const schema = Joi.object({
          ledger_id: Joi.number().integer(),
          amount: Joi.number().precision(2),
          narration: Joi.string().allow(null, "").optional(),
          file_url: Joi.string().uri().allow(null, "").optional(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const resp = await this.usecase.updateItem(
          parseInt(req.params.payment_item_id, 10),
          value
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/items/:payment_item_id", async (req, res) => {
      try {
        const resp = await this.usecase.deleteItem(
          parseInt(req.params.payment_item_id, 10)
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

module.exports = (usecase, designationsUsecase) => {
  return new PaymentsRoutes(usecase, designationsUsecase);
};

