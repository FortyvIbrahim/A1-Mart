const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class StickeringRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    // Create single stickering record
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          product_id: Joi.number().integer().positive().required(),
          qty: Joi.number().integer().positive().required(),
          employee_code: Joi.string().allow(null).optional(),
          status: Joi.string()
            .valid("open", "in_progress", "done", "cancelled")
            .default("open")
            .optional(),
          packing: Joi.number().integer().allow(null).optional(),
          loose: Joi.number().integer().allow(null).optional(),
          pur_ret: Joi.number().integer().allow(null).optional(),
          wastage: Joi.number().integer().allow(null).optional(),
          purchase_acknowledgment_id: Joi.number()
            .integer()
            .allow(null)
            .optional(),
          supervisor_id: Joi.string().max(50).allow(null, "").optional(),
          repack_supervisor_id: Joi.string()
            .max(50)
            .allow(null, "")
            .optional(),
          sticker_type_1: Joi.number().integer().allow(null).optional(),
          sticker_type_2: Joi.number().integer().allow(null).optional(),
          material_type: Joi.string()
            .valid("single", "double", "looping")
            .allow(null)
            .optional(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.create(value);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Bulk create stickering records
    router.post("/bulk", async (req, res) => {
      try {
        const schema = Joi.array().items(
          Joi.object({
            product_id: Joi.number().integer().positive().required(),
            qty: Joi.number().integer().positive().required(),
            employee_code: Joi.string().allow(null).optional(),
            status: Joi.string()
              .valid("open", "in_progress", "done", "cancelled")
              .default("open")
              .optional(),
            packing: Joi.number().integer().allow(null).optional(),
            loose: Joi.number().integer().allow(null).optional(),
            pur_ret: Joi.number().integer().allow(null).optional(),
            wastage: Joi.number().integer().allow(null).optional(),
            purchase_acknowledgment_id: Joi.number()
              .integer()
              .allow(null)
              .optional(),
            supervisor_id: Joi.string().max(50).allow(null, "").optional(),
            repack_supervisor_id: Joi.string()
              .max(50)
              .allow(null, "")
              .optional(),
            sticker_type_1: Joi.number().integer().allow(null).optional(),
            sticker_type_2: Joi.number().integer().allow(null).optional(),
            material_type: Joi.string()
              .valid("single", "double", "looping")
              .allow(null)
              .optional(),
            is_new_product: Joi.boolean().optional(),
            product_name: Joi.string().when("is_new_product", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
          })
        );

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.bulkCreate(value);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    const listStickeringQuerySchema = Joi.object({
      from: Joi.date().optional(),
      to: Joi.date().optional(),
    }).unknown(true);

    // Get all stickering records
    router.get("/", async (req, res) => {
      try {
        const { error, value } = listStickeringQuerySchema.validate(req.query);
        if (error) {
          throw error;
        }
        const filters = {};
        if (value.from) filters.from = value.from;
        if (value.to) filters.to = value.to;
        const result = await this.usecase.getAll(filters);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get stickering records for current logged-in employee
    router.get("/mine", async (req, res) => {
      try {
        if (!req.decoded || !req.decoded.employee_id) {
          res.status(401).json({
            code: 401,
            message: "Access Denied. Employee code not found in token.",
          });
          res.end();
          return;
        }

        const employeeCode = req.decoded.employee_id;
        const result = await this.usecase.getByEmployeeCode(employeeCode);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get stickering records for current logged-in supervisor
    router.get("/supervisor", async (req, res) => {
      try {
        const supervisorId = req.decoded.employee_id;
        const result = await this.usecase.getBySupervisorId(supervisorId);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get stickering records by purchase acknowledgment ID
    router.get("/purchase-ack/:purchaseAckId", async (req, res) => {
      try {
        const schema = Joi.object({
          purchaseAckId: Joi.number().integer().positive().required(),
        });

        const { error, value } = schema.validate({
          purchaseAckId: parseInt(req.params.purchaseAckId),
        });
        if (error) {
          throw error;
        }

        const result = await this.usecase.getByPurchaseAcknowledgmentId(
          value.purchaseAckId
        );
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get stickering record by ID
    router.get("/:stickeringId", async (req, res) => {
      try {
        const schema = Joi.object({
          stickeringId: Joi.number().integer().positive().required(),
        });

        const { error, value } = schema.validate({
          stickeringId: parseInt(req.params.stickeringId),
        });
        if (error) {
          throw error;
        }

        const result = await this.usecase.getById(value.stickeringId);
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update stickering record
    router.put("/:stickeringId", async (req, res) => {
      try {
        const paramsSchema = Joi.object({
          stickeringId: Joi.number().integer().positive().required(),
        });

        const bodySchema = Joi.object({
          product_id: Joi.number().integer().positive(),
          qty: Joi.number().integer().positive(),
          employee_code: Joi.string().allow(null),
          status: Joi.string().valid(
            "open",
            "in_progress",
            "done",
            "cancelled"
          ),
          packing: Joi.number().integer().allow(null),
          loose: Joi.number().integer().allow(null),
          pur_ret: Joi.number().integer().allow(null),
          wastage: Joi.number().integer().allow(null),
          purchase_acknowledgment_id: Joi.number().integer().allow(null),
          supervisor_id: Joi.string().max(50).allow(null, ""),
          repack_supervisor_id: Joi.string().max(50).allow(null, ""),
          sticker_type_1: Joi.number().integer().allow(null),
          sticker_type_2: Joi.number().integer().allow(null),
          material_type: Joi.string()
            .valid("single", "double", "looping")
            .allow(null),
        }).min(1); // At least one field must be provided

        const paramsValidation = paramsSchema.validate({
          stickeringId: parseInt(req.params.stickeringId),
        });
        if (paramsValidation.error) {
          throw paramsValidation.error;
        }

        const bodyValidation = bodySchema.validate(req.body);
        if (bodyValidation.error) {
          throw bodyValidation.error;
        }

        const result = await this.usecase.update(
          paramsValidation.value.stickeringId,
          bodyValidation.value
        );
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete stickering record
    router.delete("/:stickeringId", async (req, res) => {
      try {
        const schema = Joi.object({
          stickeringId: Joi.number().integer().positive().required(),
        });

        const { error, value } = schema.validate({
          stickeringId: parseInt(req.params.stickeringId),
        });
        if (error) {
          throw error;
        }

        const result = await this.usecase.delete(value.stickeringId);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
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
  return new StickeringRoutes(usecase);
};
