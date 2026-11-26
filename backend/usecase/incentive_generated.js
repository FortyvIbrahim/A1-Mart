class IncentiveGeneratedUsecase {
  constructor(incentiveGeneratedRepo) {
    this.incentiveGeneratedRepo = incentiveGeneratedRepo;
  }

  // ---------- Headers ----------

  createHeader(header, items = []) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.incentiveGeneratedRepo.getExistingByBranchAndDesignations(
          header.branch_id ?? null,
          header.designation_id ?? null,
          header.start_date,
          header.end_date
        );
        if (existing) {
          resolve({
            code: 400,
            message:
              "Incentive has already been generated for this branch, designation(s) and date range.",
          });
          return;
        }

        const id = await this.incentiveGeneratedRepo.createHeader(header);

        if (items && items.length > 0) {
          await this.incentiveGeneratedRepo.upsertItems(id, items);
        }

        resolve({
          code: 200,
          message: "Incentive generated created successfully",
          data: { incentive_generated_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllHeaders() {
    return new Promise(async (resolve, reject) => {
      try {
        const rows = await this.incentiveGeneratedRepo.getAllHeaders();
        resolve({
          code: 200,
          message: "Incentive generated list retrieved successfully",
          data: rows,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getItemsByMonthYear(month, year) {
    return new Promise(async (resolve, reject) => {
      try {
        const items = await this.incentiveGeneratedRepo.getItemsByMonthYear(
          month,
          year
        );
        resolve({
          code: 200,
          message: "Incentive items for month/year retrieved successfully",
          data: items,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const header = await this.incentiveGeneratedRepo.getHeaderById(id);
        if (!header) {
          resolve({
            code: 404,
            message: "Incentive generated not found",
          });
          return;
        }

        const items = await this.incentiveGeneratedRepo.getItemsByGeneratedId(
          id
        );

        resolve({
          code: 200,
          message: "Incentive generated retrieved successfully",
          data: {
            ...header,
            items,
          },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  updateHeader(id, header, items = undefined) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.incentiveGeneratedRepo.getHeaderById(id);
        if (!existing) {
          resolve({
            code: 404,
            message: "Incentive generated not found",
          });
          return;
        }

        if (header && Object.keys(header).length > 0) {
          const effectiveBranch =
            header.branch_id !== undefined ? header.branch_id : existing.branch_id;
          const effectiveDesignation =
            header.designation_id !== undefined
              ? header.designation_id
              : existing.designation_id;
          const effectiveStartDate =
            header.start_date !== undefined ? header.start_date : existing.start_date;
          const effectiveEndDate =
            header.end_date !== undefined ? header.end_date : existing.end_date;

          const duplicate = await this.incentiveGeneratedRepo.getExistingByBranchAndDesignations(
            effectiveBranch,
            effectiveDesignation,
            effectiveStartDate,
            effectiveEndDate,
            id
          );
          if (duplicate) {
            resolve({
              code: 400,
              message:
                "Incentive has already been generated for this branch, designation(s) and date range.",
            });
            return;
          }
          await this.incentiveGeneratedRepo.updateHeader(id, header);
        }

        if (Array.isArray(items)) {
          await this.incentiveGeneratedRepo.upsertItems(id, items);
        }

        resolve({
          code: 200,
          message: "Incentive generated updated successfully",
          data: { incentive_generated_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  deleteHeader(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.incentiveGeneratedRepo.getHeaderById(id);
        if (!existing) {
          resolve({
            code: 404,
            message: "Incentive generated not found",
          });
          return;
        }

        const result = await this.incentiveGeneratedRepo.deleteHeader(id);
        resolve({
          code: 200,
          message: "Incentive generated deleted successfully",
          data: { affectedRows: result.affectedRows, incentive_generated_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // ---------- Items-only operations ----------

  upsertItems(id, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.incentiveGeneratedRepo.getHeaderById(id);
        if (!existing) {
          resolve({
            code: 404,
            message: "Incentive generated not found",
          });
          return;
        }

        const result = await this.incentiveGeneratedRepo.upsertItems(
          id,
          items
        );

        resolve({
          code: 200,
          message: "Incentive generated items upserted successfully",
          data: { affectedRows: result.affectedRows },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  deleteItem(id, employee_code) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.incentiveGeneratedRepo.getHeaderById(id);
        if (!existing) {
          resolve({
            code: 404,
            message: "Incentive generated not found",
          });
          return;
        }

        const result = await this.incentiveGeneratedRepo.deleteItem(
          id,
          employee_code
        );

        resolve({
          code: 200,
          message: "Incentive generated item deleted successfully",
          data: { affectedRows: result.affectedRows },
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (incentiveGeneratedRepo) => {
  return new IncentiveGeneratedUsecase(incentiveGeneratedRepo);
};

