const logger = require("../utils/logger");

class PayrollRepository {
  constructor(db) {
    this.db = db;
  }

  _formatDate(dateValue) {
    if (!dateValue) return null;
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  _formatMonthYear(dateValue) {
    if (!dateValue) return null;
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    // Store as first of month to represent month+year
    return `${year}-${month}-01`;
  }

  getPayrollByMonth(payroll_month) {
    return new Promise((resolve, reject) => {
      const formattedMonth = this._formatMonthYear(payroll_month);
      if (!formattedMonth) {
        resolve(undefined);
        return;
      }
      this.db.query(
        "SELECT * FROM payroll WHERE payroll_month = ? LIMIT 1",
        [formattedMonth],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYROLL",
              code: "REPOSITORY.PAYROLL.GET_BY_MONTH",
              description: err.toString(),
              category: "",
              ref: { payroll_month },
            });
            reject(err);
            return;
          }
          resolve(rows[0] || undefined);
        }
      );
    });
  }

  /**
   * Get payroll_employee_id and payroll_id for a given employee_code and selected_month (date, first day of month).
   * Returns { payroll_employee_id, payroll_id } or null.
   */
  getPayrollEmployeeByEmployeeCodeAndMonth(employee_code, selected_month) {
    return new Promise((resolve, reject) => {
      const formattedMonth = this._formatMonthYear(selected_month);
      if (!formattedMonth) {
        resolve(null);
        return;
      }
      this.db.query(
        `SELECT pe.payroll_employee_id, pe.payroll_id FROM payroll_employees pe
         INNER JOIN payroll p ON pe.payroll_id = p.payroll_id
         WHERE p.payroll_month = ? AND pe.employee_code = ?
         LIMIT 1`,
        [formattedMonth, employee_code],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYROLL",
              code: "REPOSITORY.PAYROLL.GET_PE_BY_CODE_MONTH",
              description: err.toString(),
              category: "",
              ref: { employee_code, selected_month },
            });
            reject(err);
            return;
          }
          const row = rows?.[0];
          resolve(row ? { payroll_employee_id: row.payroll_employee_id, payroll_id: row.payroll_id } : null);
        }
      );
    });
  }

  /**
   * Get payroll_id and employee_code for a payroll_employee_id (for resolving generated payslip lookup).
   */
  getPayrollIdAndEmployeeCodeByPayrollEmployeeId(payroll_employee_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT payroll_id, employee_code FROM payroll_employees WHERE payroll_employee_id = ? LIMIT 1",
        [payroll_employee_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYROLL",
              code: "REPOSITORY.PAYROLL.GET_PAYROLL_ID_CODE",
              description: err.toString(),
              category: "",
              ref: { payroll_employee_id },
            });
            reject(err);
            return;
          }
          const row = rows?.[0];
          resolve(row ? { payroll_id: row.payroll_id, employee_code: row.employee_code } : null);
        }
      );
    });
  }

  createPayroll(payroll_month = null, employees = [], is_approved = false) {
    return new Promise((resolve, reject) => {
      const sql = "INSERT INTO payroll (payroll_month, is_approved) VALUES (?, ?)";
      const formattedMonth = this._formatMonthYear(payroll_month);
      const approved = is_approved === true || is_approved === 1;
      this.db.query(sql, [formattedMonth, approved], (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PAYROLL",
            code: "REPOSITORY.PAYROLL.CREATE",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        const payroll_id = result.insertId;

        if (!employees || employees.length === 0) {
          resolve(payroll_id);
          return;
        }

        const values = employees.map((e) => [
          payroll_id,
          e.employee_code,
          this._formatDate(e.date_of_joining),
          e.actual_pay ?? null,
          e.no_of_working_days ?? null,
          e.incentive ?? null,
          e.lateness_amt ?? null,
          e.overtime_amt ?? null,
          e.advance ?? null,
          e.penalty ?? null,
          e.employee_esi ?? null,
          e.employee_epf ?? null,
          e.employer_esi ?? null,
          e.employer_epf ?? null,
          e.days_per_month ?? null,
          e.lop_days ?? null,
          e.per_day_salary ?? null,
          e.gross_pay ?? null,
          e.lop_amount ?? null,
          e.net_pay ?? null,
          e.payment_details != null ? JSON.stringify(e.payment_details) : null,
          e.is_generated === true || e.is_generated === 1 ? 1 : 0,
          e.on_hold === true || e.on_hold === 1 ? 1 : 0,
          e.late_early_hours ?? null,
        ]);

        const insertSql = `
          INSERT INTO payroll_employees (
            payroll_id,
            employee_code,
            date_of_joining,
            actual_pay,
            no_of_working_days,
            incentive,
            lateness_amt,
            overtime_amt,
            advance,
            penalty,
            employee_esi,
            employee_epf,
            employer_esi,
            employer_epf,
            days_per_month,
            lop_days,
            per_day_salary,
            gross_pay,
            lop_amount,
            net_pay,
            payment_details,
            is_generated,
            on_hold,
            late_early_hours
          ) VALUES ?
        `;

        this.db.query(insertSql, [values], (err2) => {
          if (err2) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYROLL",
              code: "REPOSITORY.PAYROLL.EMPLOYEES.CREATE",
              description: err2.toString(),
              category: "",
              ref: { payroll_id },
            });
            reject(err2);
            return;
          }
          resolve(payroll_id);
        });
      });
    });
  }

  getAllPayrolls() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*,
          (SELECT COUNT(*) FROM payroll_employees pe WHERE pe.payroll_id = p.payroll_id) AS employee_count,
          (SELECT COUNT(*) FROM payroll_employees pe
           WHERE pe.payroll_id = p.payroll_id
             AND pe.payment_details IS NOT NULL
             AND JSON_UNQUOTE(JSON_EXTRACT(pe.payment_details, '$.status')) = 'Processed') AS payment_done_count
        FROM payroll p
        ORDER BY p.created_at DESC
      `;

      this.db.query(sql, [], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PAYROLL",
            code: "REPOSITORY.PAYROLL.GET_ALL",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  }

  /**
   * Get a single payroll_employee by payroll_employee_id with payroll, employee, designation, department.
   * Returns same shape as getPayrollEmployeesByEmployeeCode (one row).
   */
  getPayrollEmployeeById(payroll_employee_id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT pe.*, p.payroll_month,
               e.employee_name, e.profile_img_url, e.account_no, e.ifsc_code, e.pf_uan,
               des.designation_name, dep.department_name
        FROM payroll_employees pe
        INNER JOIN payroll p ON pe.payroll_id = p.payroll_id
        LEFT JOIN employees e ON pe.employee_code = e.employee_code
        LEFT JOIN designations des ON e.designation_id = des.designation_id
        LEFT JOIN departments dep ON e.department_id = dep.department_id
        WHERE pe.payroll_employee_id = ?
      `;
      this.db.query(sql, [payroll_employee_id], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PAYROLL",
            code: "REPOSITORY.PAYROLL.GET_PAYROLL_EMPLOYEE_BY_ID",
            description: err.toString(),
            category: "",
            ref: { payroll_employee_id },
          });
          reject(err);
          return;
        }
        const row = rows?.[0];
        if (!row) {
          resolve(undefined);
          return;
        }
        const { employee_name, profile_img_url, account_no, ifsc_code, pf_uan, designation_name, department_name, payment_details, payroll_month, ...rest } = row;
        const parsedPaymentDetails =
          payment_details != null
            ? typeof payment_details === "string"
              ? (() => {
                try {
                  return JSON.parse(payment_details);
                } catch {
                  return null;
                }
              })()
              : payment_details
            : null;
        resolve({
          ...rest,
          payment_details: parsedPaymentDetails,
          payroll: {
            payroll_id: row.payroll_id,
            payroll_month,
          },
          employee: row.employee_code
            ? {
              employee_code: row.employee_code,
              employee_name,
              profile_img_url,
              account_no,
              ifsc_code,
              pf_uan: pf_uan ?? null,
              designation_name: designation_name ?? null,
              department_name: department_name ?? null,
            }
            : null,
        });
      });
    });
  }

  updatePayslipUrl(payroll_employee_id, payslip_url) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE payroll_employees SET payslip_url = ?, updated_at = CURRENT_TIMESTAMP WHERE payroll_employee_id = ?",
        [payslip_url, payroll_employee_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYROLL",
              code: "REPOSITORY.PAYROLL.UPDATE_PAYSLIP_URL",
              description: err.toString(),
              category: "",
              ref: { payroll_employee_id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  createPayrollGeneratedPayslip(payroll_id, employee_code, selected_month, payslip_data) {
    return new Promise((resolve, reject) => {
      const formattedMonth = this._formatMonthYear(selected_month);
      const dataJson = typeof payslip_data === "string" ? payslip_data : JSON.stringify(payslip_data);
      this.db.query(
        `INSERT INTO payroll_generated_payslip (payroll_id, employee_code, selected_month, payslip_data)
         VALUES (?, ?, ?, ?)`,
        [payroll_id, employee_code, formattedMonth, dataJson],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYROLL",
              code: "REPOSITORY.PAYROLL.CREATE_GENERATED_PAYSLIP",
              description: err.toString(),
              category: "",
              ref: { payroll_id, employee_code },
            });
            reject(err);
            return;
          }
          resolve({ payroll_generated_payslip_id: result.insertId });
        }
      );
    });
  }

  getLatestPayrollGeneratedPayslipByPayrollEmployeeId(payroll_employee_id) {
    return new Promise((resolve, reject) => {
      this.getPayrollIdAndEmployeeCodeByPayrollEmployeeId(payroll_employee_id).then((ref) => {
        if (!ref) {
          resolve(undefined);
          return;
        }
        const { payroll_id, employee_code } = ref;
        this.db.query(
          `SELECT * FROM payroll_generated_payslip
           WHERE payroll_id = ? AND employee_code = ?
           ORDER BY created_at DESC
           LIMIT 1`,
          [payroll_id, employee_code],
          (err, rows) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PAYROLL",
                code: "REPOSITORY.PAYROLL.GET_LATEST_GENERATED_PAYSLIP",
                description: err.toString(),
                category: "",
                ref: { payroll_employee_id, payroll_id, employee_code },
              });
              reject(err);
              return;
            }
            const row = rows?.[0];
            if (!row) {
              resolve(undefined);
              return;
            }
            const payslip_data =
              row.payslip_data != null
                ? typeof row.payslip_data === "string"
                  ? (() => {
                    try {
                      return JSON.parse(row.payslip_data);
                    } catch {
                      return null;
                    }
                  })()
                  : row.payslip_data
                : null;
            resolve({
              ...row,
              payslip_data,
            });
          }
        );
      }).catch(reject);
    });
  }

  updatePayrollGeneratedPayslipUrl(payroll_generated_payslip_id, payslip_url) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE payroll_generated_payslip SET payslip_url = ?, updated_at = CURRENT_TIMESTAMP WHERE payroll_generated_payslip_id = ?",
        [payslip_url, payroll_generated_payslip_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYROLL",
              code: "REPOSITORY.PAYROLL.UPDATE_GENERATED_PAYSLIP_URL",
              description: err.toString(),
              category: "",
              ref: { payroll_generated_payslip_id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  /**
   * Get all payroll_employees rows for a given employee_code (current user).
   * Returns each row with payroll header (payroll_id, payroll_month) and parsed payment_details.
   */
  getPayrollEmployeesByEmployeeCode(employee_code) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT pe.*, p.payroll_month,
               e.employee_name, e.profile_img_url, e.account_no, e.ifsc_code, e.pf_uan,
               e.branch_id, b.branch_name,
               (SELECT pgp.payslip_url FROM payroll_generated_payslip pgp WHERE pgp.payroll_id = pe.payroll_id AND pgp.employee_code = pe.employee_code ORDER BY pgp.created_at DESC LIMIT 1) AS generated_payslip_url,
               EXISTS(SELECT 1 FROM payroll_generated_payslip pgp WHERE pgp.payroll_id = pe.payroll_id AND pgp.employee_code = pe.employee_code) AS is_payslip_available
        FROM payroll_employees pe
        INNER JOIN payroll p ON pe.payroll_id = p.payroll_id
        LEFT JOIN employees e ON pe.employee_code = e.employee_code
        LEFT JOIN branches b ON e.branch_id = b.branch_id
        WHERE pe.employee_code = ?
        ORDER BY p.payroll_month DESC
      `;
      this.db.query(sql, [employee_code], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PAYROLL",
            code: "REPOSITORY.PAYROLL.GET_BY_EMPLOYEE_CODE",
            description: err.toString(),
            category: "",
            ref: { employee_code },
          });
          reject(err);
          return;
        }
        const mapped =
          (rows || []).map((row) => {
            const { employee_name, profile_img_url, account_no, ifsc_code, pf_uan, branch_id, branch_name, payment_details, payroll_month, generated_payslip_url, is_payslip_available, ...rest } = row;
            const parsedPaymentDetails =
              payment_details != null
                ? typeof payment_details === "string"
                  ? (() => {
                    try {
                      return JSON.parse(payment_details);
                    } catch {
                      return null;
                    }
                  })()
                  : payment_details
                : null;
            return {
              ...rest,
              payslip_url: generated_payslip_url ?? null,
              is_payslip_available: is_payslip_available == 1,
              payment_details: parsedPaymentDetails,
              payroll: {
                payroll_id: row.payroll_id,
                payroll_month,
              },
              employee: row.employee_code
                ? {
                  employee_code: row.employee_code,
                  employee_name,
                  profile_img_url,
                  account_no,
                  ifsc_code,
                  pf_uan: pf_uan ?? null,
                  branch_id: branch_id ?? null,
                  branch_name: branch_name ?? null,
                }
                : null,
            };
          });
        resolve(mapped);
      });
    });
  }

  /**
   * Get all payroll_employees rows (all payslips), same shape as getPayrollEmployeesByEmployeeCode
   * but without employee_code filter.
   */
  getAllPayrollEmployeesPayslips() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT pe.*, p.payroll_month,
               e.employee_name, e.profile_img_url, e.account_no, e.ifsc_code, e.pf_uan,
               e.branch_id, b.branch_name,
               (SELECT pgp.payslip_url FROM payroll_generated_payslip pgp WHERE pgp.payroll_id = pe.payroll_id AND pgp.employee_code = pe.employee_code ORDER BY pgp.created_at DESC LIMIT 1) AS generated_payslip_url,
               EXISTS(SELECT 1 FROM payroll_generated_payslip pgp WHERE pgp.payroll_id = pe.payroll_id AND pgp.employee_code = pe.employee_code) AS is_payslip_available
        FROM payroll_employees pe
        INNER JOIN payroll p ON pe.payroll_id = p.payroll_id
        LEFT JOIN employees e ON pe.employee_code = e.employee_code
        LEFT JOIN branches b ON e.branch_id = b.branch_id
        ORDER BY p.payroll_month DESC, pe.employee_code ASC
      `;
      this.db.query(sql, [], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PAYROLL",
            code: "REPOSITORY.PAYROLL.GET_ALL_PAYSLIPS",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        const mapped =
          (rows || []).map((row) => {
            const { employee_name, profile_img_url, account_no, ifsc_code, pf_uan, branch_id, branch_name, payment_details, payroll_month, generated_payslip_url, is_payslip_available, ...rest } = row;
            const parsedPaymentDetails =
              payment_details != null
                ? typeof payment_details === "string"
                  ? (() => {
                    try {
                      return JSON.parse(payment_details);
                    } catch {
                      return null;
                    }
                  })()
                  : payment_details
                : null;
            return {
              ...rest,
              payslip_url: generated_payslip_url ?? null,
              is_payslip_available: is_payslip_available == 1,
              payment_details: parsedPaymentDetails,
              payroll: {
                payroll_id: row.payroll_id,
                payroll_month,
              },
              employee: row.employee_code
                ? {
                  employee_code: row.employee_code,
                  employee_name,
                  profile_img_url,
                  account_no,
                  ifsc_code,
                  pf_uan: pf_uan ?? null,
                  branch_id: branch_id ?? null,
                  branch_name: branch_name ?? null,
                }
                : null,
            };
          });
        resolve(mapped);
      });
    });
  }

  getPayrollById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM payroll WHERE payroll_id = ?",
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYROLL",
              code: "REPOSITORY.PAYROLL.GET_BY_ID",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          const payroll = rows[0];
          if (!payroll) {
            resolve(undefined);
            return;
          }

          this.db.query(
            `SELECT pe.*, e.employee_name, e.profile_img_url, e.account_no, e.ifsc_code, e.branch_id, b.branch_name,
                    (SELECT pgp.payslip_url
                       FROM payroll_generated_payslip pgp
                      WHERE pgp.payroll_id = pe.payroll_id
                        AND pgp.employee_code = pe.employee_code
                      ORDER BY pgp.created_at DESC
                      LIMIT 1) AS generated_payslip_url,
                    EXISTS(
                      SELECT 1
                      FROM payroll_generated_payslip pgp
                      WHERE pgp.payroll_id = pe.payroll_id
                        AND pgp.employee_code = pe.employee_code
                    ) AS is_payslip_available
             FROM payroll_employees pe
             LEFT JOIN employees e ON pe.employee_code = e.employee_code
             LEFT JOIN branches b ON e.branch_id = b.branch_id
             WHERE pe.payroll_id = ?
             ORDER BY pe.employee_code ASC`,
            [id],
            (err2, employees) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PAYROLL",
                  code: "REPOSITORY.PAYROLL.EMPLOYEES.GET_BY_ID",
                  description: err2.toString(),
                  category: "",
                  ref: { id },
                });
                reject(err2);
                return;
              }
              const mappedEmployees =
                employees?.map((row) => {
                  const { employee_name, profile_img_url, account_no, ifsc_code, branch_id, branch_name, payment_details, generated_payslip_url, is_payslip_available, ...rest } = row;
                  const parsedPaymentDetails =
                    payment_details != null
                      ? typeof payment_details === "string"
                        ? (() => {
                          try {
                            return JSON.parse(payment_details);
                          } catch {
                            return null;
                          }
                        })()
                        : payment_details
                      : null;
                  return {
                    ...rest,
                    payslip_url: generated_payslip_url ?? null,
                    is_payslip_available: is_payslip_available == 1,
                    payment_details: parsedPaymentDetails,
                    employee: row.employee_code
                      ? {
                        employee_code: row.employee_code,
                        employee_name,
                        profile_img_url,
                        account_no,
                        ifsc_code,
                        branch_id: branch_id ?? null,
                        branch_name: branch_name ?? null,
                      }
                      : null,
                  };
                }) || [];

              resolve({
                ...payroll,
                employees: mappedEmployees,
              });
            }
          );
        }
      );
    });
  }

  updatePayroll(id, employees = undefined, payroll_month = undefined, is_approved = undefined) {
    return new Promise((resolve, reject) => {
      const updateHeader = (cb) => {
        if (payroll_month === undefined && is_approved === undefined) {
          cb();
          return;
        }
        const sets = [];
        const params = [];
        if (payroll_month !== undefined) {
          sets.push("payroll_month = ?");
          params.push(this._formatMonthYear(payroll_month));
        }
        if (is_approved !== undefined) {
          sets.push("is_approved = ?");
          params.push(is_approved === true || is_approved === 1);
        }
        sets.push("updated_at = CURRENT_TIMESTAMP");
        params.push(id);
        this.db.query(
          `UPDATE payroll SET ${sets.join(", ")} WHERE payroll_id = ?`,
          params,
          (err) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PAYROLL",
                code: "REPOSITORY.PAYROLL.UPDATE_HEADER",
                description: err.toString(),
                category: "",
                ref: { id, payroll_month, is_approved },
              });
              reject(err);
              return;
            }
            cb();
          }
        );
      };

      // If employees not provided, only update header
      if (!employees) {
        updateHeader(() => {
          resolve({ affectedRows: 0 });
        });
        return;
      }

      updateHeader(() => {
        this.db.query(
          "DELETE FROM payroll_employees WHERE payroll_id = ?",
          [id],
          (err) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PAYROLL",
                code: "REPOSITORY.PAYROLL.EMPLOYEES.DELETE",
                description: err.toString(),
                category: "",
                ref: { id },
              });
              reject(err);
              return;
            }

            if (!employees || employees.length === 0) {
              resolve({ affectedRows: 0 });
              return;
            }

            const values = employees.map((e) => [
              id,
              e.employee_code,
              this._formatDate(e.date_of_joining),
              e.actual_pay ?? null,
              e.no_of_working_days ?? null,
              e.incentive ?? null,
              e.lateness_amt ?? null,
              e.overtime_amt ?? null,
              e.advance ?? null,
              e.penalty ?? null,
              e.employee_esi ?? null,
              e.employee_epf ?? null,
              e.employer_esi ?? null,
              e.employer_epf ?? null,
              e.days_per_month ?? null,
              e.lop_days ?? null,
              e.per_day_salary ?? null,
              e.gross_pay ?? null,
              e.lop_amount ?? null,
              e.net_pay ?? null,
              e.payment_details != null ? JSON.stringify(e.payment_details) : null,
              e.is_generated === true || e.is_generated === 1 ? 1 : 0,
              e.on_hold === true || e.on_hold === 1 ? 1 : 0,
              e.late_early_hours ?? null,
            ]);

            const insertSql = `
              INSERT INTO payroll_employees (
                payroll_id,
                employee_code,
                date_of_joining,
                actual_pay,
                no_of_working_days,
                incentive,
                lateness_amt,
                overtime_amt,
                advance,
                penalty,
                employee_esi,
                employee_epf,
                employer_esi,
                employer_epf,
                days_per_month,
                lop_days,
                per_day_salary,
                gross_pay,
                lop_amount,
                net_pay,
                payment_details,
                is_generated,
                on_hold,
                late_early_hours
              ) VALUES ?
            `;

            this.db.query(insertSql, [values], (err2, result) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PAYROLL",
                  code: "REPOSITORY.PAYROLL.EMPLOYEES.UPDATE",
                  description: err2.toString(),
                  category: "",
                  ref: { id },
                });
                reject(err2);
                return;
              }
              resolve({ affectedRows: result.affectedRows });
            });
          }
        );
      });
    });
  }

  deletePayroll(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM payroll WHERE payroll_id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYROLL",
              code: "REPOSITORY.PAYROLL.DELETE",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new PayrollRepository(db);
};

