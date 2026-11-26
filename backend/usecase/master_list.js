class MasterListUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.repo.create(payload);
        resolve({
          code: 200,
          message: "Master list entry created successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkCreate(rows) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.repo.bulkCreate(rows);
        resolve({
          code: 200,
          message: "Master list entries bulk insert completed successfully",
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

  assignBuyersIfEmpty(assignments) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.repo.assignBuyersIfEmpty(assignments);
        resolve({
          code: 200,
          message: "Buyers assigned for suppliers without existing buyer mappings",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  assignBuyersAdd(assignments) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.repo.assignBuyersAdd(assignments);
        resolve({
          code: 200,
          message: "Buyers added to supplier mappings",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkUpsertByName(rows, person_type) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.repo.bulkUpsertByName(rows, person_type);
        resolve({
          code: 200,
          message: "Master list entries bulk upsert by name completed successfully",
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

  update(master_id, payload) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if entry exists first
        const existingEntry = await this.repo.getById(master_id);
        if (!existingEntry) {
          resolve({
            code: 404,
            message: "Master list entry not found",
          });
          return;
        }

        const result = await this.repo.update(master_id, payload);
        if (result.affectedRows > 0 || payload.buyer_ids !== undefined) {
          const updatedEntry = await this.repo.getById(master_id);
          resolve({
            code: 200,
            message: "Master list entry updated successfully",
            data: updatedEntry,
          });
        } else {
          resolve({
            code: 400,
            message: "No changes made to the master list entry",
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
        const entries = await this.repo.getAll();
        resolve({
          code: 200,
          message: "Master list entries retrieved successfully",
          data: entries,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(master_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const entry = await this.repo.getById(master_id);
        if (entry) {
          resolve({
            code: 200,
            message: "Master list entry retrieved successfully",
            data: entry,
          });
        } else {
          resolve({
            code: 404,
            message: "Master list entry not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  updateStatus(master_id, status) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if entry exists first
        const existingEntry = await this.repo.getById(master_id);
        if (!existingEntry) {
          resolve({
            code: 404,
            message: "Master list entry not found",
          });
          return;
        }

        const result = await this.repo.updateStatus(master_id, status);
        if (result.affectedRows > 0) {
          const updatedEntry = await this.repo.getById(master_id);
          resolve({
            code: 200,
            message: "Master list entry status updated successfully",
            data: updatedEntry,
          });
        } else {
          resolve({
            code: 400,
            message: "Failed to update status",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo) => {
  return new MasterListUsecase(repo);
};

