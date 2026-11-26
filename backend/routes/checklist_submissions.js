const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

const answerSchema = Joi.object({
  question_id: Joi.number().integer().required(),
  question: Joi.object().required(),
  value: Joi.object().unknown(true).required(),
});

const createBodySchema = Joi.object({
  checklist_form_id: Joi.number().integer().required(),
  local_date: Joi.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  answers: Joi.array().items(answerSchema).required(),
}).unknown(true);

const updateBodySchema = Joi.object({
  checklist_form_id: Joi.number().integer().optional(),
  local_date: Joi.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  answers: Joi.array().items(answerSchema).required(),
})
  .min(1)
  .unknown(true);

function branchIdFromDecoded(decoded) {
  if (!decoded || decoded.branch_id == null || decoded.branch_id === "") {
    return null;
  }
  const raw = decoded.branch_id;
  const n = Number(typeof raw === "string" ? raw.trim() : raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

class ChecklistSubmissionsRoutes {
  constructor(usecase, designationsUsecase) {
    this.usecase = usecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    router.get("/", async (req, res) => {
      try {
        const schema = Joi.object({
          checklist_form_id: Joi.number().integer().required(),
          local_date: Joi.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .required(),
        });
        const { error, value } = schema.validate(req.query);
        if (error) throw error;

        const employeeCode = req.decoded && req.decoded.employee_id;
        if (!employeeCode) {
          res.status(403).json({ code: 403, message: "Missing employee context" });
          res.end();
          return;
        }

        const branchId = branchIdFromDecoded(req.decoded);
        const perm = await this.designationsUsecase.checkPermissions(
          employeeCode,
          ["access_all_branches"]
        );
        const accessAllBranches = !!(
          employeeCode && perm && perm.hasAllPermissions
        );
        const resp = await this.usecase.getByQuery(
          employeeCode,
          branchId,
          value.checklist_form_id,
          value.local_date,
          accessAllBranches
        );
        const status = resp.code === 200 ? 200 : resp.code === 403 ? 403 : 400;
        res.status(status).json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.post("/", async (req, res) => {
      try {
        const { error, value } = createBodySchema.validate(req.body);
        if (error) throw error;

        const employeeCode = req.decoded && req.decoded.employee_id;
        const userId = req.decoded && req.decoded.user_id;
        if (!employeeCode) {
          res.status(403).json({ code: 403, message: "Missing employee context" });
          res.end();
          return;
        }

        const branchId = branchIdFromDecoded(req.decoded);
        const resp = await this.usecase.create(
          employeeCode,
          userId,
          branchId,
          value
        );
        const status =
          resp.code === 200
            ? 201
            : resp.code === 409
              ? 409
              : resp.code === 403
                ? 403
                : 400;
        res.status(status).json(resp);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new Error("Invalid id");

        const { error, value } = updateBodySchema.validate(req.body);
        if (error) throw error;

        const employeeCode = req.decoded && req.decoded.employee_id;
        const userId = req.decoded && req.decoded.user_id;
        if (!employeeCode) {
          res.status(403).json({ code: 403, message: "Missing employee context" });
          res.end();
          return;
        }

        const branchId = branchIdFromDecoded(req.decoded);
        const resp = await this.usecase.update(
          employeeCode,
          userId,
          branchId,
          id,
          value
        );
        res
          .status(
            resp.code === 200
              ? 200
              : resp.code === 404
                ? 404
                : resp.code === 403
                  ? 403
                  : 400
          )
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
  return new ChecklistSubmissionsRoutes(usecase, designationsUsecase);
};
