const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

function branchIdFromDecoded(decoded) {
  if (!decoded || decoded.branch_id == null || decoded.branch_id === "") {
    return null;
  }
  const raw = decoded.branch_id;
  const n = Number(typeof raw === "string" ? raw.trim() : raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function attachBranchToFormPayload(resp, branchId) {
  if (
    resp &&
    resp.code === 200 &&
    resp.data &&
    typeof resp.data === "object" &&
    branchId != null
  ) {
    resp.data = { ...resp.data, branch_id: branchId };
  }
}

const questionSchema = Joi.object({
  id: Joi.number().integer().optional(),
  form_id: Joi.number().integer().optional(),
  _id: Joi.string().optional(),
  sort_order: Joi.number().integer().required(),
  title: Joi.string().required(),
  description: Joi.string().allow(null, "").optional(),
  question_type: Joi.string()
    .valid("boolean", "numeric", "text", "media", "date", "date_time")
    .required(),
  fill_at_from: Joi.string()
    .regex(/^\d{2}:\d{2}$/)
    .allow(null, "")
    .optional(),
  fill_at_to: Joi.string()
    .regex(/^\d{2}:\d{2}$/)
    .allow(null, "")
    .optional(),
  is_required: Joi.boolean().default(false),
  record_audio: Joi.boolean().default(false),
  take_image: Joi.boolean().default(false),
  is_image_optional: Joi.boolean().default(false),
  take_video: Joi.boolean().default(false),
  is_video_optional: Joi.boolean().default(false),
  allow_comment: Joi.boolean().default(false),
  is_comment_optional: Joi.boolean().default(false),
});

class ChecklistFormsRoutes {
  constructor(usecase, designationsUsecase) {
    this.usecase = usecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          title: Joi.string().required(),
          report_to_designation_ids: Joi.array()
            .items(Joi.number().integer())
            .default([]),
          questions: Joi.array().items(questionSchema).default([]),
        });
        const { error, value } = schema.validate(req.body);
        if (error) throw error;
        const branchId = branchIdFromDecoded(req.decoded);
        const resp = await this.usecase.create(value);
        attachBranchToFormPayload(resp, branchId);
        res.status(resp.code === 200 ? 201 : 400).json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid checklist form id");

        const schema = Joi.object({
          title: Joi.string().optional(),
          report_to_designation_ids: Joi.array()
            .items(Joi.number().integer())
            .optional(),
          questions: Joi.array().items(questionSchema).optional(),
        }).min(1);
        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const branchId = branchIdFromDecoded(req.decoded);
        const resp = await this.usecase.update(id, value);
        attachBranchToFormPayload(resp, branchId);
        res
          .status(resp.code === 200 ? 200 : resp.code === 404 ? 404 : 400)
          .json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/", async (req, res) => {
      try {
        const employeeCode = req.decoded && req.decoded.employee_id;
        const perm = await this.designationsUsecase.checkPermissions(
          employeeCode,
          ["access_all_branches"]
        );
        const accessAllBranches = !!(
          employeeCode && perm && perm.hasAllPermissions
        );
        const branchId = branchIdFromDecoded(req.decoded);
        const resp = await this.usecase.getAll(branchId, accessAllBranches);
        res.json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/with-submission-stats", async (req, res) => {
      try {
        const employeeCode = req.decoded && req.decoded.employee_id;
        const perm = await this.designationsUsecase.checkPermissions(
          employeeCode,
          ["access_all_branches"]
        );
        const accessAllBranches = !!(
          employeeCode && perm && perm.hasAllPermissions
        );
        const branchId = branchIdFromDecoded(req.decoded);
        const resp = await this.usecase.getAllWithSubmissionStats(
          branchId,
          accessAllBranches
        );
        const status = resp.code === 403 ? 403 : 200;
        res.status(status).json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/with-submission-answers", async (req, res) => {
      try {
        const employeeCode = req.decoded && req.decoded.employee_id;
        const perm = await this.designationsUsecase.checkPermissions(
          employeeCode,
          ["access_all_branches"]
        );
        const accessAllBranches = !!(
          employeeCode && perm && perm.hasAllPermissions
        );
        const branchId = branchIdFromDecoded(req.decoded);
        const resp = await this.usecase.getAllWithSubmissionAnswers(
          branchId,
          accessAllBranches
        );
        const status = resp.code === 403 ? 403 : 200;
        res.status(status).json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid checklist form id");

        const employeeCode = req.decoded && req.decoded.employee_id;
        const perm = await this.designationsUsecase.checkPermissions(
          employeeCode,
          ["access_all_branches"]
        );
        const accessAllBranches = !!(
          employeeCode && perm && perm.hasAllPermissions
        );
        const branchId = branchIdFromDecoded(req.decoded);
        const resp = await this.usecase.getById(id, branchId, accessAllBranches);
        res
          .status(resp.code === 200 ? 200 : resp.code === 404 ? 404 : 400)
          .json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid checklist form id");

        const resp = await this.usecase.delete(id);
        res
          .status(resp.code === 200 ? 200 : resp.code === 404 ? 404 : 400)
          .json(resp);
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

module.exports = (usecase, designationsUsecase) => {
  return new ChecklistFormsRoutes(usecase, designationsUsecase);
};

