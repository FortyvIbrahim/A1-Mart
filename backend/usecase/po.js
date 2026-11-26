class PoUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(header, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.repo.create(header, items || []);
        resolve({
          code: 200,
          message: "Purchase order created successfully",
          data: result,
        });
      } catch (err) {
        if (err && err.code === "ER_DUP_ENTRY" && err.po_id != null) {
          resolve({
            code: 409,
            message: `PO order already exists. PO number: ${err.po_id}`,
          });
          return;
        }
        reject(err);
      }
    });
  }

  getById(po_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const row = await this.repo.getById(po_id);
        if (row) {
          resolve({
            code: 200,
            message: "Purchase order retrieved successfully",
            data: row,
          });
        } else {
          resolve({ code: 404, message: "Purchase order not found" });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll() {
    return new Promise(async (resolve, reject) => {
      try {
        const rows = await this.repo.getAll();
        resolve({
          code: 200,
          message: "Purchase orders retrieved successfully",
          data: rows,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  update(po_id, header, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.repo.getById(po_id);
        if (!existing) {
          resolve({ code: 404, message: "Purchase order not found" });
          return;
        }
        const updated = await this.repo.update(po_id, header, items);
        resolve({
          code: 200,
          message: "Purchase order updated successfully",
          data: updated,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(po_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.repo.getById(po_id);
        if (!existing) {
          resolve({ code: 404, message: "Purchase order not found" });
          return;
        }
        await this.repo.delete(po_id);
        resolve({
          code: 200,
          message: "Purchase order deleted successfully",
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo) => {
  return new PoUsecase(repo);
};
