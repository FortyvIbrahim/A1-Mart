class PurchaseReordersUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.repo.create(payload);
        resolve({
          code: 200,
          message: "Purchase reorder created successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkUpsert(rows) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.repo.bulkUpsert(rows);
        resolve({
          code: 200,
          message: "Purchase reorders bulk upsert completed",
          data: {
            affectedRows: response.affectedRows,
            insertedId: response.insertedId,
          },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.repo.getById(id);
        if (!existing) {
          resolve({ code: 404, message: "Purchase reorder not found" });
          return;
        }
        const result = await this.repo.update(id, payload);
        if (result.affectedRows > 0) {
          const updated = await this.repo.getById(id);
          resolve({
            code: 200,
            message: "Purchase reorder updated successfully",
            data: updated,
          });
        } else {
          resolve({
            code: 400,
            message: "No changes made",
          });
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
          message: "Purchase reorders retrieved successfully",
          data: rows,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const row = await this.repo.getById(id);
        if (row) {
          resolve({
            code: 200,
            message: "Purchase reorder retrieved successfully",
            data: row,
          });
        } else {
          resolve({ code: 404, message: "Purchase reorder not found" });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.repo.getById(id);
        if (!existing) {
          resolve({ code: 404, message: "Purchase reorder not found" });
          return;
        }
        await this.repo.delete(id);
        resolve({
          code: 200,
          message: "Purchase reorder deleted successfully",
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo) => {
  return new PurchaseReordersUsecase(repo);
};
