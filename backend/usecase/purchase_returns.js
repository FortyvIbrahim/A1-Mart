class PurchaseReturnsUsecase {
  constructor(purchaseReturnsRepo) {
    this.purchaseReturnsRepo = purchaseReturnsRepo;
  }

  create(data) {
    return this.purchaseReturnsRepo.create(data);
  }

  getById(id) {
    return this.purchaseReturnsRepo.getById(id);
  }

  getAll(branchId) {
    return this.purchaseReturnsRepo.getAll(branchId);
  }

  update(id, data, employees) {
    return this.purchaseReturnsRepo.update(id, data, employees);
  }

  delete(id) {
    return this.purchaseReturnsRepo.delete(id);
  }

  createDelivered(data) {
    return this.purchaseReturnsRepo.createDelivered(data);
  }

  getDeliveredById(purchase_returns_items_delivered_id) {
    return this.purchaseReturnsRepo.getDeliveredById(purchase_returns_items_delivered_id);
  }

  getDeliveredByItemId(purchase_returns_items_id) {
    return this.purchaseReturnsRepo.getDeliveredByItemId(purchase_returns_items_id);
  }

  updateDelivered(purchase_returns_items_delivered_id, data) {
    return this.purchaseReturnsRepo.updateDelivered(purchase_returns_items_delivered_id, data);
  }

  deleteDelivered(purchase_returns_items_delivered_id) {
    return this.purchaseReturnsRepo.deleteDelivered(purchase_returns_items_delivered_id);
  }
}

module.exports = (purchaseReturnsRepo) => {
  return new PurchaseReturnsUsecase(purchaseReturnsRepo);
};
