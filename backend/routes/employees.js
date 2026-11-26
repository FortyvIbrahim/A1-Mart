const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

function employeeUpdateBodySchema() {
  return {
    employee_name: Joi.string(),
    designation_id: Joi.number().integer().allow(null),
    department_id: Joi.number().integer().allow(null),
    gender: Joi.string().valid("F", "M", "O"),
    religion: Joi.string().valid("hindu", "muslim", "christian").allow(null),
    marital_status: Joi.string().valid("S", "M").allow(null),
    birthdate: Joi.date().allow(null),
    probation: Joi.number().integer().allow(null),
    confirmation_date: Joi.date().allow(null),
    termination_date: Joi.date().allow(null),
    email_id: Joi.string().email().allow(null),
    hours_worked_per_year: Joi.number().precision(2).allow(null),
    hours_worked_per_week: Joi.number().precision(2).allow(null),
    part_time: Joi.boolean(),
    mobile_number: Joi.number().allow(null),
    is_face_registered: Joi.boolean(),
    termination_reason: Joi.string().allow(null, ""),
    terminated: Joi.boolean(),
    profile_img_url: Joi.string().uri().allow(null, "").optional(),
    incentive_type: Joi.string().max(50).allow(null, "").optional(),
    account_no: Joi.string().max(50).allow(null, "").optional(),
    ifsc_code: Joi.string().max(20).allow(null, "").optional(),
    pf_uan: Joi.string().max(20).allow(null, "").optional(),
    buyer_alias: Joi.string().max(255).allow(null, "").optional(),
    rest_day: Joi.number().integer().min(1).max(7).allow(null).optional(),
    branch_id: Joi.number().integer().allow(null).optional(),
    driver_details: Joi.object({
      dl_number: Joi.string().max(100).allow(null, "").optional(),
      dl_file: Joi.string().max(500).allow(null, "").optional(),
      vehicle_classes: Joi.array().items(Joi.string()).allow(null).optional(),
      valid_till: Joi.date().allow(null).optional(),
    }).allow(null).optional(),
  };
}

class EmployeesRoutes {
  constructor(usecase, designationsUsecase) {
    this.usecase = usecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    router.post("/bulk", async (req, res) => {
      try {
        const schema = Joi.array().items(
          Joi.object({
            employee_code: Joi.string().required(),
            employee_name: Joi.string().required(),
            designation_id: Joi.number().integer().allow(null),
            department_id: Joi.number().integer().allow(null),
            gender: Joi.string().valid("F", "M", "O").required(),
            religion: Joi.string().valid("hindu", "muslim", "christian").allow(null),
            marital_status: Joi.string().valid("S", "M").allow(null),
            birthdate: Joi.date().allow(null),
            probation: Joi.number().integer().allow(null),
            confirmation_date: Joi.date().allow(null),
            termination_date: Joi.date().allow(null),
            email_id: Joi.string().email().allow(null),
            hours_worked_per_year: Joi.number().precision(2).allow(null),
            hours_worked_per_week: Joi.number().precision(2).allow(null),
            part_time: Joi.boolean().default(false),
            mobile_number: Joi.number().allow(null),
            is_face_registered: Joi.boolean().default(false),
            termination_reason: Joi.string().allow(null, ""),
            terminated: Joi.boolean().default(false),
            profile_img_url: Joi.string().uri().allow(null, "").optional(),
            incentive_type: Joi.string().max(50).allow(null, "").optional(),
            account_no: Joi.string().max(50).allow(null, "").optional(),
            ifsc_code: Joi.string().max(20).allow(null, "").optional(),
            pf_uan: Joi.string().max(20).allow(null, "").optional(),
            rest_day: Joi.number().integer().min(1).max(7).allow(null).optional(),
            branch_id: Joi.number().integer().allow(null).optional(),
          })
        );
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.bulkCreate(req.body);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.post("/", async (req, res) => {
      try {
        const schema = {
          employee_code: Joi.string().required(),
          employee_name: Joi.string().required(),
          designation_id: Joi.number().integer().allow(null),
          department_id: Joi.number().integer().allow(null),
          gender: Joi.string().valid("F", "M", "O").required(),
          religion: Joi.string().valid("hindu", "muslim", "christian").allow(null),
          marital_status: Joi.string().valid("S", "M").allow(null),
          birthdate: Joi.date().allow(null),
          probation: Joi.number().integer().allow(null),
          confirmation_date: Joi.date().allow(null),
          termination_date: Joi.date().allow(null),
          email_id: Joi.string().email().allow(null),
          hours_worked_per_year: Joi.number().precision(2).allow(null),
          hours_worked_per_week: Joi.number().precision(2).allow(null),
          part_time: Joi.boolean().default(false),
          mobile_number: Joi.number().allow(null),
          is_face_registered: Joi.boolean().default(false),
          termination_reason: Joi.string().allow(null, ""),
          terminated: Joi.boolean().default(false),
          profile_img_url: Joi.string().uri().allow(null, "").optional(),
          incentive_type: Joi.string().max(50).allow(null, "").optional(),
          account_no: Joi.string().max(50).allow(null, "").optional(),
          ifsc_code: Joi.string().max(20).allow(null, "").optional(),
          pf_uan: Joi.string().max(20).allow(null, "").optional(),
          rest_day: Joi.number().integer().min(1).max(7).allow(null).optional(),
          branch_id: Joi.number().integer().allow(null).optional(),
          driver_details: Joi.object({
            dl_number: Joi.string().max(100).allow(null, "").optional(),
            dl_file: Joi.string().max(500).allow(null, "").optional(),
            vehicle_classes: Joi.array().items(Joi.string()).allow(null).optional(),
            valid_till: Joi.date().allow(null).optional(),
          }).allow(null).optional(),
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

    router.put("/:employee_code", async (req, res) => {
      try {
        const isValid = Joi.validate(req.body, employeeUpdateBodySchema());
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.update(
          req.params.employee_code,
          req.body
        );
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.patch("/:employee_code", async (req, res) => {
      try {
        const isValid = Joi.validate(req.body, employeeUpdateBodySchema());
        if (isValid.error !== null) throw isValid.error;

        const resp = await this.usecase.update(
          req.params.employee_code,
          req.body
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

    router.get(
      "/by-branch/:branch_id/:department_id/:section_id",
      async (req, res) => {
        try {
          const schema = Joi.object({
            branch_id: Joi.number().integer().required(),
            department_id: Joi.number().integer().required(),
            section_id: Joi.number().integer().required(),
          });
          const { error, value } = schema.validate({
            branch_id: parseInt(req.params.branch_id, 10),
            department_id: parseInt(req.params.department_id, 10),
            section_id: parseInt(req.params.section_id, 10),
          });
          if (error) throw error;

          const rows = await this.usecase.getByBranchDepartmentSection(
            value.branch_id,
            value.department_id,
            value.section_id
          );
          res.json({ code: 200, data: rows });
        } catch (err) {
          respondError(res, err);
        }
        res.end();
      }
    );

    router.get("/:employee_code", async (req, res) => {
      try {
        const resp = await this.usecase.getById(req.params.employee_code);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:employee_code", async (req, res) => {
      try {
        const resp = await this.usecase.delete(req.params.employee_code);
        res.json({ code: 200, data: resp });
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Sync all data
    router.post("/sync", async (req, res) => {
      try {
        const result = await this.usecase.sync();
        res.json({ code: 200, msg: "Data successfully synced!" });
      } catch (err) {
        console.log(err);
        res.json({ code: 500, msg: "An error occurred!" });
      }
    });
  }

  getRouter() {
    return router;
  }
}

module.exports = (usecase, designationsUsecase) => {
  return new EmployeesRoutes(usecase, designationsUsecase);
};
