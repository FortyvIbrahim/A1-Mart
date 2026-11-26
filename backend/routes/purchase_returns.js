// routes/purchase_returns.js
const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

const itemSchema = Joi.object({
  product_id: Joi.number().required(),
  qty: Joi.number().required(),
  total_amount: Joi.number().optional(),
  pr_date: Joi.string().optional(),
  pr_no: Joi.string().optional(),
  outlet_id: Joi.number().optional(),
});

const employeeSupplierSchema = Joi.object({
  employee_code: Joi.string().required(),
  suppliers: Joi.array()
    .items(
      Joi.object({
        supplier_id: Joi.number().required(),
        no_of_boxes: Joi.number().required(),
        items: Joi.array().items(itemSchema).optional().default([]),
      })
    )
    .optional()
    .default([]),
});

const createSchema = {
  driver_id: Joi.string().required(),
  attachment: Joi.string().max(2048).allow(null, "").optional(),
  status: Joi.string().valid("open", "closed").optional(),
  receipt_entry_handled_by: Joi.string().allow(null, "").optional(),
  receiving_branch_id: Joi.number().allow(null).optional(),
  employees: Joi.array().items(employeeSupplierSchema).optional().default([]),
};

const updateSchema = {
  driver_id: Joi.string().optional(),
  attachment: Joi.string().max(2048).allow(null, "").optional(),
  status: Joi.string().valid("open", "closed").optional(),
  receipt_entry_handled_by: Joi.string().allow(null, "").optional(),
  receiving_branch_id: Joi.number().allow(null).optional(),
  employees: Joi.array().items(employeeSupplierSchema).optional(),
};

const deliveredSchema = {
  supplier_id: Joi.number().allow(null).optional(),
  pick_up_name: Joi.string().allow(null, "").optional(),
  pick_up_number: Joi.string().allow(null, "").optional(),
  purchase_returns_items_ids: Joi.array().items(Joi.number()).optional().default([]),
  attachment: Joi.array().items(Joi.string().max(2048)).optional().default([]),
};

class PurchaseReturnsRoutes {
  constructor(purchaseReturnsUsecase, designationsUsecase) {
    this.purchaseReturnsUsecase = purchaseReturnsUsecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    // Create
    router.post("/", async (req, res) => {
      try {
        const isValid = Joi.validate(req.body, createSchema);
        if (isValid.error !== null) throw isValid.error;

        const payload = {
          driver_id: req.body.driver_id,
          attachment: req.body.attachment || null,
          status: req.body.status || "open",
          receipt_entry_handled_by: req.body.receipt_entry_handled_by || null,
          receiving_branch_id: req.body.receiving_branch_id != null ? req.body.receiving_branch_id : null,
          employees: req.body.employees || [],
        };
        const id = await this.purchaseReturnsUsecase.create(payload);
        res.status(201).json({ purchase_return_id: id });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // --- Delivered (by delivered id or by item id; must be before /:id) ---
    router.post("/delivered", async (req, res) => {
      try {
        const isValid = Joi.validate(req.body, deliveredSchema);
        if (isValid.error !== null) throw isValid.error;
        const id = await this.purchaseReturnsUsecase.createDelivered(req.body);
        res.status(201).json({ purchase_returns_items_delivered_id: id });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/delivered/:purchase_returns_items_delivered_id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.purchase_returns_items_delivered_id, 10);
        if (isNaN(id)) throw new Error("Invalid purchase_returns_items_delivered_id");
        const data = await this.purchaseReturnsUsecase.getDeliveredById(id);
        if (!data) return res.status(404).json({ error: "Not found" });
        res.json(data);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/items/:purchase_returns_items_id(\\d+)/delivered", async (req, res) => {
      try {
        const purchase_returns_items_id = parseInt(req.params.purchase_returns_items_id, 10);
        if (isNaN(purchase_returns_items_id)) throw new Error("Invalid purchase_returns_items_id");
        const data = await this.purchaseReturnsUsecase.getDeliveredByItemId(purchase_returns_items_id);
        res.json(Array.isArray(data) ? data : []);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.put("/delivered/:purchase_returns_items_delivered_id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.purchase_returns_items_delivered_id, 10);
        if (isNaN(id)) throw new Error("Invalid purchase_returns_items_delivered_id");
        const isValid = Joi.validate(req.body, deliveredSchema);
        if (isValid.error !== null) throw isValid.error;
        await this.purchaseReturnsUsecase.updateDelivered(id, req.body);
        res.json({ success: true });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/delivered/:purchase_returns_items_delivered_id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.purchase_returns_items_delivered_id, 10);
        if (isNaN(id)) throw new Error("Invalid purchase_returns_items_delivered_id");
        await this.purchaseReturnsUsecase.deleteDelivered(id);
        res.json({ success: true });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Read all
    router.get("/", async (req, res) => {
      try {
        const filterByBranch = req.query.filter_by_branch === "true" || req.query.filter_by_branch === true;
        let branchId = null;
        if (filterByBranch) {
          const isAllBranchAllowedRes =
            await this.designationsUsecase.checkPermissions(
              req.decoded.employee_id,
              ["access_all_branches"]
            );
          if (!isAllBranchAllowedRes.hasAllPermissions) {
            branchId = req.decoded.branch_id ?? null;
          }
        }
        const data = await this.purchaseReturnsUsecase.getAll(branchId);
        res.json(data);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Read one
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid purchase_return_id");
        const data = await this.purchaseReturnsUsecase.getById(id);
        if (!data) return res.status(404).json({ error: "Not found" });
        res.json(data);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update (header and/or employees + suppliers; replace list when employees provided)
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid purchase_return_id");
        const isValid = Joi.validate(req.body, updateSchema);
        if (isValid.error !== null) throw isValid.error;

        const payload = {};
        if (req.body.driver_id !== undefined) payload.driver_id = req.body.driver_id;
        if (req.body.attachment !== undefined) payload.attachment = req.body.attachment;
        if (req.body.status !== undefined) payload.status = req.body.status;
        if (req.body.receipt_entry_handled_by !== undefined) payload.receipt_entry_handled_by = req.body.receipt_entry_handled_by;
        if (req.body.receiving_branch_id !== undefined) payload.receiving_branch_id = req.body.receiving_branch_id;

        const employees =
          req.body.employees !== undefined ? req.body.employees : undefined;

        await this.purchaseReturnsUsecase.update(id, payload, employees);
        res.json({ success: true });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid purchase_return_id");
        await this.purchaseReturnsUsecase.delete(id);
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

module.exports = (purchaseReturnsUsecase, designationsUsecase) => {
  return new PurchaseReturnsRoutes(purchaseReturnsUsecase, designationsUsecase);
};
