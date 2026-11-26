const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class PayrollRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    const payrollEmployeeSchema = Joi.object({
      employee_code: Joi.string().required(),
      date_of_joining: Joi.date().allow(null).optional(),
      actual_pay: Joi.number().precision(2).allow(null).optional(),
      no_of_working_days: Joi.number().precision(2).allow(null).optional(),
      incentive: Joi.number().precision(2).allow(null).optional(),
      lateness_amt: Joi.number().precision(2).allow(null).optional(),
      overtime_amt: Joi.number().precision(2).allow(null).optional(),
      advance: Joi.number().precision(2).allow(null).optional(),
      penalty: Joi.number().precision(2).allow(null).optional(),
      employee_esi: Joi.number().precision(2).allow(null).optional(),
      employee_epf: Joi.number().precision(2).allow(null).optional(),
      employer_esi: Joi.number().precision(2).allow(null).optional(),
      employer_epf: Joi.number().precision(2).allow(null).optional(),
      days_per_month: Joi.number().integer().allow(null).optional(),
      lop_days: Joi.number().precision(2).allow(null).optional(),
      late_early_hours: Joi.number().precision(2).allow(null).optional(),
      per_day_salary: Joi.number().precision(2).allow(null).optional(),
      gross_pay: Joi.number().precision(2).allow(null).optional(),
      lop_amount: Joi.number().precision(2).allow(null).optional(),
      net_pay: Joi.number().precision(2).allow(null).optional(),
      payment_details: Joi.object().unknown(true).allow(null).optional(),
      is_generated: Joi.boolean().optional(),
      on_hold: Joi.boolean().optional(),
    });

    // Create payroll with employees
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          payroll_month: Joi.date().required(),
          employees: Joi.array().items(payrollEmployeeSchema).min(1).required(),
          is_approved: Joi.boolean().optional(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.create({
          payroll_month: value.payroll_month,
          employees: value.employees,
        });
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all payrolls
    router.get("/", async (_req, res) => {
      try {
        const result = await this.usecase.getAll();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all payslips (all payroll_employees, same shape as /me but no employee filter)
    router.get("/payslips", async (_req, res) => {
      try {
        const result = await this.usecase.getAllPayslips();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Prepare payslip data for given (employee_code, selected_month) pairs. Stores data in payroll_generated_payslip; does not generate PDF.
    router.post("/payslips/prepare", async (req, res) => {
      try {
        const schema = Joi.object({
          items: Joi.array()
            .items(
              Joi.object({
                employee_code: Joi.string().required(),
                selected_month: Joi.date().required(),
              })
            )
            .min(1)
            .required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }
        const result = await this.usecase.preparePayslips(value.items);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Generate payslip PDF from latest payroll_generated_payslip row for payroll_employee_id; returns payslip_url
    router.post("/payslips/generate-payslip", async (req, res) => {
      try {
        const schema = Joi.object({
          payroll_employee_id: Joi.number().integer().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }
        const result = await this.usecase.generatePayslip(value.payroll_employee_id);
        res
          .status(
            result.code === 200 ? 200 : result.code === 404 ? 404 : result.code === 503 ? 503 : 400
          )
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get payroll_employee details for the currently logged-in user
    router.get("/me", async (req, res) => {
      try {
        const employee_code = req.decoded?.employee_id;
        if (!employee_code) {
          res.status(403).json({
            code: 403,
            message: "Unauthorized: employee context required",
          });
          res.end();
          return;
        }
        const result = await this.usecase.getMyPayrollDetails(employee_code);
        res.status(result.code === 200 ? 200 : result.code === 403 ? 403 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get payroll by id (with employees)
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          throw new Error("Invalid payroll_id");
        }

        const result = await this.usecase.getById(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update payroll (month and/or employees; employees replace list if provided)
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          throw new Error("Invalid payroll_id");
        }

        const schema = Joi.object({
          payroll_month: Joi.date().optional(),
          employees: Joi.array().items(payrollEmployeeSchema).min(1).optional(),
          is_approved: Joi.boolean().optional(),
        }).min(1); // require at least one field

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.update(id, {
          payroll_month: value.payroll_month,
          employees: value.employees,
          is_approved: value.is_approved,
        });
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete payroll (and employees via cascade)
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          throw new Error("Invalid payroll_id");
        }

        const result = await this.usecase.delete(id);
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
  return new PayrollRoutes(usecase);
};

