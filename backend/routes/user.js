const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class UserRoutes {
  constructor(usecase) {
    this.usecase = usecase;

    this.init();
  }

  init() {
    router.post("/login", async (req, res) => {
      try {
        const schema = {
          username: Joi.string().required(),
          password: Joi.string().required(),
        };

        const username = req.body.username;
        const password = req.body.password;

        const isValid = Joi.validate(
          {
            username: username,
            password: password,
          },
          schema
        );

        if (isValid.error !== null) {
          throw isValid.error;
        }

        const getUserDetails = await this.usecase.login(
          req.body.username,
          req.body.password
        );

        res.json(getUserDetails);
      } catch (err) {
        respondError(res, err);
      }

      res.end();
    });

    router.post("/register", async (req, res) => {
      try {
        const schema = {
          username: Joi.string().required(),
          password: Joi.string().required(),
        };

        const username = req.body.username;
        const password = req.body.password;

        const isValid = Joi.validate(
          {
            username: username,
            password: password,
          },
          schema
        );

        if (isValid.error !== null) {
          throw isValid.error;
        }

        const getUserDetails = await this.usecase.register(
          req.body.username,
          req.body.password
        );

        res.json(getUserDetails);
      } catch (err) {
        respondError(res, err);
      }

      res.end();
    });

    router.get("/info", async (req, res) => {
      try {
        const user_id = req.decoded.user_id;
        const userDetails = await this.usecase.getUserDetails(user_id);

        res.json(userDetails);
      } catch (err) {
        respondError(res, err);
      }

      res.end();
    });

    router.get("/", (req, res) => {
      res.json({ code: 200, msg: "Success !" });
      res.end();
    });

    router.post("/totp/setup", async (req, res) => {
      try {
        const user_id = req.decoded?.user_id;
        if (!user_id) {
          res.json({ code: 401, msg: "Unauthorized" });
          res.end();
          return;
        }

        const result = await this.usecase.generateTotpSecret(user_id);
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }

      res.end();
    });

    router.post("/totp/verify-setup", async (req, res) => {
      try {
        const schema = {
          token: Joi.string().required(),
        };

        const token = req.body.token;

        const isValid = Joi.validate(
          {
            token: token,
          },
          schema
        );

        if (isValid.error !== null) {
          throw isValid.error;
        }

        const user_id = req.decoded?.user_id;
        if (!user_id) {
          res.json({ code: 401, msg: "Unauthorized" });
          res.end();
          return;
        }

        const result = await this.usecase.verifyTotpSetup(user_id, token);
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }

      res.end();
    });

    router.post("/totp/verify-login", async (req, res) => {
      try {
        const schema = {
          temp_token: Joi.string().required(),
          totp_token: Joi.string().required(),
        };

        const temp_token = req.body.temp_token;
        const totp_token = req.body.totp_token;

        const isValid = Joi.validate(
          {
            temp_token: temp_token,
            totp_token: totp_token,
          },
          schema
        );

        if (isValid.error !== null) {
          throw isValid.error;
        }

        const result = await this.usecase.verifyTotpLogin(
          temp_token,
          totp_token
        );
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }

      res.end();
    });

    router.post("/totp/disable", async (req, res) => {
      try {
        const user_id = req.decoded?.user_id;
        if (!user_id) {
          res.json({ code: 401, msg: "Unauthorized" });
          res.end();
          return;
        }

        const result = await this.usecase.disableTotp(user_id);
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }

      res.end();
    });

    router.put("/totp/enabled", async (req, res) => {
      try {
        const schema = {
          employee_code: Joi.string().required(),
          enabled: Joi.boolean().required(),
        };

        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) {
          throw isValid.error;
        }

        const { employee_code, enabled } = req.body;
        const result = await this.usecase.updateTotpEnabledByEmployeeCode(
          employee_code,
          enabled
        );
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }

      res.end();
    });

    router.delete("/totp/:employee_code", async (req, res) => {
      try {
        const schema = {
          employee_code: Joi.string().required(),
        };

        const isValid = Joi.validate(
          { employee_code: req.params.employee_code },
          schema
        );
        if (isValid.error !== null) {
          throw isValid.error;
        }

        const employee_code = req.params.employee_code;
        const result = await this.usecase.disableTotpByEmployeeCode(
          employee_code
        );
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }

      res.end();
    });

    // Delete user row by employee_code
    router.delete("/employee/:employee_code", async (req, res) => {
      try {
        const schema = {
          employee_code: Joi.string().required(),
        };

        const isValid = Joi.validate(
          { employee_code: req.params.employee_code },
          schema
        );
        if (isValid.error !== null) {
          throw isValid.error;
        }

        const employee_code = req.params.employee_code;
        const result = await this.usecase.deleteUserByEmployeeCode(
          employee_code
        );
        res.json(result);
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
  return new UserRoutes(usecase);
};
