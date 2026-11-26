class ApiCallLogsUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return this.repo.create(payload);
  }

  bulkCreate(logs) {
    return this.repo.bulkCreate(logs);
  }

  getAll(options) {
    return this.repo.getAll(options);
  }

  getById(id) {
    return this.repo.getById(id);
  }

  getByApiType(apiType, options) {
    return this.repo.getByApiType(apiType, options);
  }

  getBySecondaryType(secondaryType, options) {
    return this.repo.getBySecondaryType(secondaryType, options);
  }

  getFailedCalls(options) {
    return this.repo.getFailedCalls(options);
  }

  getByCorrelationId(correlationId) {
    return this.repo.getByCorrelationId(correlationId);
  }

  getStats(startDate, endDate) {
    return this.repo.getStats(startDate, endDate);
  }

  deleteOlderThan(days) {
    return this.repo.deleteOlderThan(days);
  }

  delete(id) {
    return this.repo.delete(id);
  }

  /**
   * Cleanup old logs based on retention policy
   * @param {number} successRetentionDays - Days to keep successful logs (default: 30)
   * @param {number} failureRetentionDays - Days to keep failed logs (default: 90)
   */
  async cleanup(successRetentionDays = 30, failureRetentionDays = 90) {
    // Delete old successful logs
    const successResult = await this.repo.deleteOlderThan(successRetentionDays);
    
    return {
      deletedSuccessLogs: successResult.deletedCount,
    };
  }
}

module.exports = (repo) => {
  return new ApiCallLogsUsecase(repo);
};
