const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class ApiCallLogsRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    // GET /api-call-logs - List logs with filters
    router.get("/", async (req, res) => {
      try {
        const schema = {
          limit: Joi.number().integer().min(1).max(500).default(100),
          offset: Joi.number().integer().min(0).default(0),
          api_type: Joi.string()
            .valid("GOFRUGAL", "DELIUM", "DIGISME", "AWS_S3")
            .optional(),
          secondary_type: Joi.string().optional(),
          is_success: Joi.boolean().optional(),
        };
        const isValid = Joi.validate(req.query, schema);
        if (isValid.error !== null) throw isValid.error;

        const options = {
          limit: parseInt(req.query.limit) || 100,
          offset: parseInt(req.query.offset) || 0,
          api_type: req.query.api_type,
          secondary_type: req.query.secondary_type,
          is_success: req.query.is_success !== undefined 
            ? req.query.is_success === "true" 
            : undefined,
        };

        const resp = await this.usecase.getAll(options);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // GET /api-call-logs/stats - Get statistics
    router.get("/stats", async (req, res) => {
      try {
        const schema = {
          start_date: Joi.date().required(),
          end_date: Joi.date().required(),
        };
        const isValid = Joi.validate(req.query, schema);
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.getStats(
          req.query.start_date,
          req.query.end_date
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // GET /api-call-logs/failures - Get failed calls
    router.get("/failures", async (req, res) => {
      try {
        const schema = {
          limit: Joi.number().integer().min(1).max(500).default(100),
          offset: Joi.number().integer().min(0).default(0),
          api_type: Joi.string()
            .valid("GOFRUGAL", "DELIUM", "DIGISME", "AWS_S3")
            .optional(),
          secondary_type: Joi.string().optional(),
        };
        const isValid = Joi.validate(req.query, schema);
        if (isValid.error !== null) throw isValid.error;

        const options = {
          limit: parseInt(req.query.limit) || 100,
          offset: parseInt(req.query.offset) || 0,
          api_type: req.query.api_type,
          secondary_type: req.query.secondary_type,
        };

        const resp = await this.usecase.getFailedCalls(options);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // GET /api-call-logs/by-api-type/:apiType - Get logs by API type
    router.get("/by-api-type/:apiType", async (req, res) => {
      try {
        const schema = {
          limit: Joi.number().integer().min(1).max(500).default(100),
          offset: Joi.number().integer().min(0).default(0),
        };
        const isValid = Joi.validate(req.query, schema);
        if (isValid.error !== null) throw isValid.error;

        const options = {
          limit: parseInt(req.query.limit) || 100,
          offset: parseInt(req.query.offset) || 0,
        };

        const resp = await this.usecase.getByApiType(req.params.apiType, options);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // GET /api-call-logs/by-secondary-type/:secondaryType - Get logs by secondary type
    router.get("/by-secondary-type/:secondaryType", async (req, res) => {
      try {
        const schema = {
          limit: Joi.number().integer().min(1).max(500).default(100),
          offset: Joi.number().integer().min(0).default(0),
        };
        const isValid = Joi.validate(req.query, schema);
        if (isValid.error !== null) throw isValid.error;

        const options = {
          limit: parseInt(req.query.limit) || 100,
          offset: parseInt(req.query.offset) || 0,
        };

        const resp = await this.usecase.getBySecondaryType(
          req.params.secondaryType,
          options
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // GET /api-call-logs/correlation/:correlationId - Get logs by correlation ID
    router.get("/correlation/:correlationId", async (req, res) => {
      try {
        const resp = await this.usecase.getByCorrelationId(
          req.params.correlationId
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // GET /api-call-logs/:id - Get single log by ID
    router.get("/:id", async (req, res) => {
      try {
        const resp = await this.usecase.getById(req.params.id);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // DELETE /api-call-logs/cleanup - Cleanup old logs
    router.delete("/cleanup", async (req, res) => {
      try {
        const schema = {
          days: Joi.number().integer().min(1).default(30),
        };
        const isValid = Joi.validate(req.query, schema);
        if (isValid.error !== null) throw isValid.error;

        const days = parseInt(req.query.days) || 30;
        const resp = await this.usecase.deleteOlderThan(days);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // DELETE /api-call-logs/:id - Delete single log
    router.delete("/:id", async (req, res) => {
      try {
        const resp = await this.usecase.delete(req.params.id);
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
  return new ApiCallLogsRoutes(usecase);
};
