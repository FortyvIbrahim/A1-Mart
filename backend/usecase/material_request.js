class MaterialRequestUsecase {
  constructor(materialRequestRepo, outletRepo, materialsUsecase) {
    this.materialRequestRepo = materialRequestRepo;
    this.outletRepo = outletRepo;
    this.materialsUsecase = materialsUsecase;
  }

  createMaterialRequest(data, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const id = await this.materialRequestRepo.createMaterialRequest(
          data,
          items
        );
        resolve(id);
      } catch (err) {
        reject(err);
      }
    });
  }

  getMaterialRequestById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.materialRequestRepo.getMaterialRequestById(id);
        if (!data) return resolve(undefined);
        let outlet = null;
        try {
          const outletData = await this.outletRepo.getById(data.outlet_id);
          if (outletData.code === 200) {
            outlet = outletData.data;
          }
        } catch (outletErr) {
          // Optionally log error
        }
        resolve({ ...data, outlet });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllMaterialRequests(branch_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.materialRequestRepo.getAllMaterialRequests(
          branch_id
        );
        const results = [];
        for (const req of data) {
          let outlet = null;
          try {
            const outletData = await this.outletRepo.getById(req.outlet_id);
            if (outletData.code === 200) {
              outlet = outletData.data;
            }
          } catch (outletErr) {
            // Optionally log error
          }
          results.push({ ...req, outlet });
        }
        resolve(results);
      } catch (err) {
        reject(err);
      }
    });
  }

  updateMaterialRequest(id, data, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.materialRequestRepo.getMaterialRequestById(
          id
        );
        const resp = await this.materialRequestRepo.updateMaterialRequest(
          id,
          data,
          items
        );

        // Update stock only when status (is_approved) actually changed
        const newStatus = data?.is_approved;
        const previousStatus = existing?.is_approved;
        const statusChanged =
          newStatus !== undefined &&
          newStatus !== null &&
          previousStatus !== undefined &&
          previousStatus !== null &&
          Number(newStatus) !== Number(previousStatus);

        if (statusChanged) {
          const itemsToUse =
            items && items.length > 0 ? items : existing?.items || [];
          for (const element of itemsToUse) {
            if (newStatus === 1) {
              await this.materialsUsecase.reduceStock(
                element.material_id,
                element.quantity
              );
            } else if (newStatus === 0) {
              await this.materialsUsecase.increaseStock(
                element.material_id,
                element.quantity
              );
            }
          }
        }
        resolve(resp);
      } catch (err) {
        reject(err);
      }
    });
  }

  deleteMaterialRequest(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.materialRequestRepo.deleteMaterialRequest(id);
        resolve(resp);
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (materialRequestRepo, outletRepo, materialsUsecase) => {
  return new MaterialRequestUsecase(
    materialRequestRepo,
    outletRepo,
    materialsUsecase
  );
};
