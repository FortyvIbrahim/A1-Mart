const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class MasterListRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    // Bulk insert master list entries
    router.post("/bulk", async (req, res) => {
      try {
        const schema = Joi.array().items(
          Joi.object({
            master_id: Joi.number().integer().positive().optional(),
            name: Joi.string().max(100).required(),
            phone: Joi.string().max(20).allow(null, "").optional(),
            contact_person_name: Joi.string()
              .max(100)
              .allow(null, "")
              .optional(),
            person_type: Joi.number().integer().required(),
            status: Joi.boolean().default(true),
            office_location: Joi.any().allow(null).optional(),
            warehouse_location_1: Joi.any().allow(null).optional(),
            warehouse_location_2: Joi.any().allow(null).optional(),
            buyer_ids: Joi.array().items(Joi.string().max(50)).optional(),
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

    // Create master list entry
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          name: Joi.string().max(100).required(),
          phone: Joi.string().max(20).allow(null, "").optional(),
          contact_person_name: Joi.string().max(100).allow(null, "").optional(),
          person_type: Joi.number().integer().required(),
          status: Joi.boolean().default(true),
          office_location: Joi.any().allow(null).optional(),
          warehouse_location_1: Joi.any().allow(null).optional(),
          warehouse_location_2: Joi.any().allow(null).optional(),
          buyer_ids: Joi.array().items(Joi.string().max(50)).optional(),
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

    router.post("/assign-buyers-if-empty", async (req, res) => {
      try {
        const schema = Joi.array().items(
          Joi.object({
            master_id: Joi.number().integer().positive().required(),
            buyer_ids: Joi.array()
              .items(Joi.string().max(50))
              .min(1)
              .required(),
          })
        );

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.assignBuyersIfEmpty(value);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.post("/assign-buyers-add", async (req, res) => {
      try {
        const schema = Joi.array().items(
          Joi.object({
            master_id: Joi.number().integer().positive().required(),
            buyer_ids: Joi.array()
              .items(Joi.string().max(50))
              .min(1)
              .required(),
          })
        );

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.assignBuyersAdd(value);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all master list entries
    router.get("/", async (req, res) => {
      try {
        const result = await this.usecase.getAll();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get master list entry by ID
    router.get("/:master_id", async (req, res) => {
      try {
        const schema = Joi.object({
          master_id: Joi.number().integer().positive().required(),
        });

        const { error, value } = schema.validate({
          master_id: parseInt(req.params.master_id),
        });
        if (error) {
          throw error;
        }

        const result = await this.usecase.getById(value.master_id);
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update master list entry
    router.put("/:master_id", async (req, res) => {
      try {
        const paramsSchema = Joi.object({
          master_id: Joi.number().integer().positive().required(),
        });

        const bodySchema = Joi.object({
          name: Joi.string().max(100),
          phone: Joi.string().max(20).allow(null, ""),
          contact_person_name: Joi.string().max(100).allow(null, ""),
          person_type: Joi.number().integer(),
          status: Joi.boolean(),
          office_location: Joi.any().allow(null),
          warehouse_location_1: Joi.any().allow(null),
          warehouse_location_2: Joi.any().allow(null),
          buyer_ids: Joi.array().items(Joi.string().max(50)).optional(),
        }).min(1); // At least one field must be provided

        const paramsValidation = paramsSchema.validate({
          master_id: parseInt(req.params.master_id),
        });
        if (paramsValidation.error) {
          throw paramsValidation.error;
        }

        const bodyValidation = bodySchema.validate(req.body);
        if (bodyValidation.error) {
          throw bodyValidation.error;
        }

        const result = await this.usecase.update(
          paramsValidation.value.master_id,
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

    // Update status only
    router.patch("/:master_id/status", async (req, res) => {
      try {
        const paramsSchema = Joi.object({
          master_id: Joi.number().integer().positive().required(),
        });

        const bodySchema = Joi.object({
          status: Joi.boolean().required(),
        });

        const paramsValidation = paramsSchema.validate({
          master_id: parseInt(req.params.master_id),
        });
        if (paramsValidation.error) {
          throw paramsValidation.error;
        }

        const bodyValidation = bodySchema.validate(req.body);
        if (bodyValidation.error) {
          throw bodyValidation.error;
        }

        const result = await this.usecase.updateStatus(
          paramsValidation.value.master_id,
          bodyValidation.value.status
        );
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
  return new MasterListRoutes(usecase);
};
