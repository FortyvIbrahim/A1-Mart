const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class OutstandingReportRoutes {
  constructor(outstandingReportUsecase) {
    this.outstandingReportUsecase = outstandingReportUsecase;
    this.init();
  }

  init() {
    const invoiceSchema = Joi.object({
      supplier_id: Joi.number().integer().required(),
      buyer_id: Joi.string().max(50).allow(null, "").optional(),
      branch_id: Joi.number().integer().required(),
      invoice_no: Joi.string().max(255).allow(null, "").optional(),
      ref_no: Joi.string().max(255).required(),
      invoice_date: Joi.date().required(),
      net_balance: Joi.number().required(),
    });

    const createSchema = Joi.object({
      report_name: Joi.string().max(255).required(),
      date: Joi.date().required(),
      invoices: Joi.array().items(invoiceSchema).optional(),
    });

    const appendInvoicesSchema = Joi.object({
      invoices: Joi.array().items(invoiceSchema).min(1).required(),
    });

    const paginationSchema = Joi.object({
      limit: Joi.number().integer().min(1).max(15000).default(15000),
      offset: Joi.number().integer().min(0).default(0),
    });

    router.post("/", async (req, res) => {
      try {
        const { error, value } = createSchema.validate(req.body);
        if (error) throw error;

        value.created_by = req.decoded.employee_id;

        const result =
          value.invoices?.length > 0
            ? await this.outstandingReportUsecase.create(value)
            : await this.outstandingReportUsecase.createHeader(value);
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.post("/:id(\\d+)/invoices", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid outstanding report id");

        const { error, value } = appendInvoicesSchema.validate(req.body);
        if (error) throw error;

        const result = await this.outstandingReportUsecase.appendInvoices(
          id,
          value.invoices
        );
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/", async (_req, res) => {
      try {
        const result = await this.outstandingReportUsecase.getAllReports();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/latest/invoices", async (req, res) => {
      try {
        const latestSchema = Joi.object({
          date: Joi.date().required(),
          limit: Joi.number().integer().min(1).max(15000).default(15000),
          offset: Joi.number().integer().min(0).default(0),
        });
        const { error, value } = latestSchema.validate(req.query);
        if (error) throw error;

        const result = await this.outstandingReportUsecase.getLatestInvoicesPage(
          value.date,
          value.limit,
          value.offset
        );
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/latest", async (req, res) => {
      try {
        const latestSchema = Joi.object({
          date: Joi.date().required(),
        });
        const { error, value } = latestSchema.validate(req.query);
        if (error) throw error;

        const result = await this.outstandingReportUsecase.getReportById(
          value.date,
          { includeInvoices: false }
        );
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:id(\\d+)/invoices", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid outstanding report id");

        const { error, value } = paginationSchema.validate(req.query);
        if (error) throw error;

        const result = await this.outstandingReportUsecase.getById(id, {
          includeInvoices: true,
          limit: value.limit,
          offset: value.offset,
        });
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid outstanding report id");

        const result = await this.outstandingReportUsecase.getById(id, {
          includeInvoices: false,
        });
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid outstanding report id");

        const result = await this.outstandingReportUsecase.delete(id);
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

module.exports = (outstandingReportUsecase) => {
  return new OutstandingReportRoutes(outstandingReportUsecase);
};
