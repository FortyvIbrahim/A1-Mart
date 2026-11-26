class DesignationsUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return this.repo.create(payload);
  }

  async bulkCreate(rows) {
    try {
      const response = await this.repo.bulkCreate(rows);
      const designations = await this.getAll();
      response.designations = designations;
      return response;
    } catch (err) {
      throw err;
    }
  }

  async update(id, payload) {
    try {
      const permissions = payload.permissions;

      if (permissions) {
        delete payload.permissions;

        await this.repo.deletePermissions(id);

        permissions.forEach(async (permission) => {
          await this.repo.addPermissions(id, permission);
        });
      }

      if (Object.keys(payload).length > 0) {
        return await this.repo.update(id, payload);
      }

      return { code: 200 };
    } catch (err) {
      throw err;
    }
  }

  getAll() {
    return this.repo.getAll();
  }

  async getById(id) {
    const response = await this.repo.getById(id);
    const permissions = await this.repo.getPermissions(id);
    response.permissions = permissions;

    return response;
  }

  delete(id) {
    return this.repo.delete(id);
  }

  async checkPermissions(employee_id, permission_keys) {
    try {
      if (!permission_keys || permission_keys.length === 0) {
        return { hasAllPermissions: true, missingPermissions: [] };
      }

      const userPermissions = await this.repo.checkEmployeePermissions(
        employee_id,
        permission_keys
      );

      const userPermissionSet = new Set(userPermissions);
      const missingPermissions = permission_keys.filter(
        (key) => !userPermissionSet.has(key)
      );

      return {
        hasAllPermissions: missingPermissions.length === 0,
        missingPermissions: missingPermissions,
      };
    } catch (err) {
      throw err;
    }
  }
}

module.exports = (repo) => {
  return new DesignationsUsecase(repo);
};
