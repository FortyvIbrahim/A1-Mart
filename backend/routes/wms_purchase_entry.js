const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class WmsPurchaseEntryRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    // Item schema for validation
    const itemSchema = Joi.object({
      product_id: Joi.number().integer().positive().required(),
      quantity: Joi.number().integer().min(1).required(),
      rate: Joi.number().precision(2).min(0).required(),
      is_new_product: Joi.boolean().optional(),
      product_name: Joi.string()
        .when("is_new_product", {
          is: true,
          then: Joi.required(),
          otherwise: Joi.optional(),
        })
        .optional(),
    });

    router.post("/", async (req, res) => {
      try {
        const schema = {
          purchase_acknowledgment_id: Joi.number()
            .integer()
            .positive()
            .required(),
          invoice_amount: Joi.number().precision(2).min(0).required(),
          handled_by: Joi.string().required(),
          is_job_entry_needed: Joi.boolean().optional(),
          credit_note_link: Joi.string().max(500).allow(null).optional(),
          items: Joi.array().items(itemSchema).optional(),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const { items, ...purchaseEntryData } = req.body;
        const resp = await this.usecase.create(purchaseEntryData, items);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.put("/:purchase_entry_id", async (req, res) => {
      try {
        const schema = {
          purchase_acknowledgment_id: Joi.number().integer().positive(),
          invoice_amount: Joi.number().precision(2).min(0),
          handled_by: Joi.string(),
          is_job_entry_needed: Joi.boolean().optional(),
          credit_note_link: Joi.string().max(500).allow(null).optional(),
          items: Joi.array().items(itemSchema).optional(),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const purchase_entry_id = parseInt(req.params.purchase_entry_id);
        if (isNaN(purchase_entry_id)) {
          throw new Error("Invalid purchase_entry_id");
        }

        const { items, ...purchaseEntryData } = req.body;
        const resp = await this.usecase.update(
          purchase_entry_id,
          purchaseEntryData,
          items
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/", async (req, res) => {
      try {
        const resp = await this.usecase.getAll();
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:purchase_entry_id", async (req, res) => {
      try {
        const purchase_entry_id = parseInt(req.params.purchase_entry_id);
        if (isNaN(purchase_entry_id)) {
          throw new Error("Invalid purchase_entry_id");
        }

        const resp = await this.usecase.getById(purchase_entry_id);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:purchase_entry_id", async (req, res) => {
      try {
        const purchase_entry_id = parseInt(req.params.purchase_entry_id);
        if (isNaN(purchase_entry_id)) {
          throw new Error("Invalid purchase_entry_id");
        }

        const resp = await this.usecase.delete(purchase_entry_id);
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
  return new WmsPurchaseEntryRoutes(usecase);
};
