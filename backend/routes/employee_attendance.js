const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class EmployeeAttendanceRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    router.post("/sync", async (_req, res) => {
      try {
        const resp = await this.usecase.syncFromDigisme();
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.post("/", async (req, res) => {
      try {
        const schema = {
          employee_code: Joi.string().max(50).required(),
          clock_date_time: Joi.date().required(),
          punch_action: Joi.string().max(50).required(),
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

    router.post("/bulk", async (req, res) => {
      try {
        const schema = {
          rows: Joi.array()
            .items(
              Joi.object({
                employee_code: Joi.string().max(50).required(),
                clock_date_time: Joi.date().required(),
                punch_action: Joi.string().max(50).required(),
              })
            )
            .min(1)
            .required(),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.bulkInsert(req.body.rows);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/", async (req, res) => {
      try {
        const filters = {};
        if (req.query.employee_code != null) filters.employee_code = req.query.employee_code;
        filters.from_date = req.query.from_date ?? req.query.fromDate ?? null;
        filters.to_date = req.query.to_date ?? req.query.toDate ?? null;

        const resp = await this.usecase.getAll(filters);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/processed", async (req, res) => {
      try {
        const filters = {};
        if (req.query.employee_code != null) filters.employee_code = req.query.employee_code;
        filters.from_date = req.query.from_date ?? req.query.fromDate ?? null;
        filters.to_date = req.query.to_date ?? req.query.toDate ?? null;

        const resp = await this.usecase.getProcessed(filters);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:attendance_id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.attendance_id, 10);
        const resp = await this.usecase.getById(id);
        if (!resp) {
          res.status(404).json({ code: 404, message: "Attendance record not found" });
          res.end();
          return;
        }
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.put("/:attendance_id(\\d+)", async (req, res) => {
      try {
        const schema = {
          employee_code: Joi.string().max(50),
          clock_date_time: Joi.date(),
          punch_action: Joi.string().max(50),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const id = parseInt(req.params.attendance_id, 10);
        const resp = await this.usecase.update(id, req.body);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:attendance_id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.attendance_id, 10);
        const resp = await this.usecase.delete(id);
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
  return new EmployeeAttendanceRoutes(usecase);
};
