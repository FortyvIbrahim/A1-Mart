// routes/stock_addition.js
const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class StockAdditionRoutes {
  constructor(stockAdditionUsecase, designationsUsecase) {
    this.designationsUsecase = designationsUsecase;
    this.stockAdditionUsecase = stockAdditionUsecase;
    this.init();
  }

  init() {
    // Create
    router.post("/", async (req, res) => {
      try {
        const schema = {
          items: Joi.array()
            .items(
              Joi.object({
                material_id: Joi.number().required(),
                quantity: Joi.number().required(),
                remark: Joi.string().allow(null, "").optional(),
              })
            )
            .optional(),
          is_approved: Joi.number().valid(0, 1).optional(),
          invoice_number: Joi.string().max(200).allow(null, "").optional(),
          invoice_date: Joi.date().allow(null).optional(),
          supplier_id: Joi.number().allow(null).optional(),
        };
        const body = req.body;
        const isValid = Joi.validate(body, schema);
        if (isValid.error !== null) throw isValid.error;

        const created_by = req.decoded.user_id;
        const is_approved =
          body.is_approved !== undefined ? body.is_approved : 0;
        const id = await this.stockAdditionUsecase.createStockAddition(
          {
            created_by,
            is_approved,
            invoice_number: body.invoice_number,
            invoice_date: body.invoice_date,
            supplier_id: body.supplier_id,
          },
          body.items || []
        );
        res.status(201).json({ stock_addition_id: id });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Read all
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

        const data = await this.stockAdditionUsecase.getAllStockAdditions(
          branch_id
        );
        res.json(data);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Read one
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const stock_addition_id = parseInt(req.params.id);
        if (isNaN(stock_addition_id))
          throw new Error("Invalid stock_addition_id");
        const data = await this.stockAdditionUsecase.getStockAdditionById(
          stock_addition_id
        );
        if (!data) return res.status(404).json({ error: "Not found" });
        res.json(data);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const stock_addition_id = parseInt(req.params.id);
        if (isNaN(stock_addition_id))
          throw new Error("Invalid stock_addition_id");
        const schema = {
          items: Joi.array()
            .items(
              Joi.object({
                material_id: Joi.number().required(),
                quantity: Joi.number().required(),
                remark: Joi.string().allow(null, "").optional(),
              })
            )
            .optional(),
          is_approved: Joi.number().valid(0, 1).optional(),
          invoice_number: Joi.string().max(200).allow(null, "").optional(),
          invoice_date: Joi.date().allow(null).optional(),
          supplier_id: Joi.number().allow(null).optional(),
        };
        const body = req.body;
        const isValid = Joi.validate(body, schema);
        if (isValid.error !== null) throw isValid.error;

        const is_approved =
          body.is_approved !== undefined ? body.is_approved : 0;

        await this.stockAdditionUsecase.updateStockAddition(
          stock_addition_id,
          {
            is_approved,
            invoice_number: body.invoice_number,
            invoice_date: body.invoice_date,
            supplier_id: body.supplier_id,
          },
          body.items || []
        );
        res.json({ success: true });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Approve endpoint
    router.post("/:id(\\d+)/approve", async (req, res) => {
      try {
        const stock_addition_id = parseInt(req.params.id);
        if (isNaN(stock_addition_id))
          throw new Error("Invalid stock_addition_id");
        const schema = {
          is_approved: Joi.number().valid(0, 1).required(),
        };
        const body = req.body;
        const isValid = Joi.validate(body, schema);
        if (isValid.error !== null) throw isValid.error;

        // Get the current stock addition to retrieve items
        const stockAddition =
          await this.stockAdditionUsecase.getStockAdditionById(
            stock_addition_id
          );
        if (!stockAddition) {
          return res.status(404).json({ error: "Stock addition not found" });
        }

        // Get items from the stock addition
        const items = stockAddition.items || [];

        await this.stockAdditionUsecase.approveStockAddition(
          stock_addition_id,
          body.is_approved,
          items
        );
        res.json({ success: true });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const stock_addition_id = parseInt(req.params.id);
        if (isNaN(stock_addition_id))
          throw new Error("Invalid stock_addition_id");
        await this.stockAdditionUsecase.deleteStockAddition(stock_addition_id);
        res.json({ success: true });
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

module.exports = (stockAdditionUsecase, designationsUsecase) => {
  return new StockAdditionRoutes(stockAdditionUsecase, designationsUsecase);
};
