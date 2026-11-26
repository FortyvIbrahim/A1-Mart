class EmployeeAttendanceUsecase {
  constructor(repo) {
    this.repo = repo;
    this.synker = null;
  }

  setSynker(synker) {
    this.synker = synker;
  }

  create(payload) {
    return this.repo.create(payload);
  }

  bulkInsert(rows) {
    return this.repo.bulkInsert(rows);
  }

  bulkUpsertProcessed(rows) {
    return this.repo.bulkUpsertProcessed(rows);
  }

  getById(attendance_id) {
    return this.repo.getById(attendance_id);
  }

  getAll(filters = {}) {
    return this.repo.getAll(filters);
  }

  getProcessed(filters = {}) {
    return this.repo.getProcessed(filters);
  }

  update(attendance_id, payload) {
    return this.repo.update(attendance_id, payload);
  }

  delete(attendance_id) {
    return this.repo.delete(attendance_id);
  }

  async syncFromDigisme() {
    if (!this.synker || !this.synker.syncDigismeAttendance) {
      throw new Error("Synker service is not configured for employee attendance sync.");
    }
    await this.synker.syncDigismeAttendance();
    return { success: true };
  }
}

module.exports = (repo) => {
  return new EmployeeAttendanceUsecase(repo);
};
