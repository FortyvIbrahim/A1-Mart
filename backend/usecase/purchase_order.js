class PurchaseOrderUsecase {
  constructor(purchaseOrderRepo, materialsUsecase = null) {
    this.purchaseOrderRepo = purchaseOrderRepo;
    this.pdfService = null;
    this.materialsUsecase = materialsUsecase;
  }

  setPdfService(pdfService) {
    this.pdfService = pdfService;
  }

  create(purchaseOrderData, items, shouldGeneratePdf = false) {
    return new Promise(async (resolve, reject) => {
      try {
        const purchaseOrderId = await this.purchaseOrderRepo.create(
          purchaseOrderData,
          items
        );

        const result = {
          code: 200,
          message: "Purchase order created successfully",
          data: { purchase_order_id: purchaseOrderId },
        };

        // Generate PDF if requested
        if (shouldGeneratePdf && this.pdfService) {
          try {
            const purchaseOrder = await this.purchaseOrderRepo.getById(
              purchaseOrderId
            );
            if (purchaseOrder) {
              // Generate PDF using pdf.js service
              const pdfResult = await this.pdfService.generatePurchaseOrderPDF(
                purchaseOrder,
                purchaseOrder.vendor // Pass vendor info from joined data
              );

              // Save PDF record to database
              await this.purchaseOrderRepo.savePdf(
                purchaseOrderId,
                pdfResult.pdf_path,
                pdfResult.pdf_filename
              );

              result.data.pdf = {
                pdf_url: pdfResult.pdf_url,
                pdf_filename: pdfResult.pdf_filename,
                s3_url: pdfResult.s3_url || null,
              };
            }
          } catch (pdfErr) {
            // Log PDF error but don't fail the request
            console.error("PDF generation error:", pdfErr);
            result.pdf_generation_error = pdfErr.message;
          }
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll() {
    return new Promise(async (resolve, reject) => {
      try {
        const orders = await this.purchaseOrderRepo.getAll();
        const sortedOrders = orders.sort(
          (a, b) => a.purchase_order_id - b.purchase_order_id
        );
        resolve({
          code: 200,
          message: "Purchase orders retrieved successfully",
          data: sortedOrders,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const order = await this.purchaseOrderRepo.getById(id);
        if (order) {
          resolve({
            code: 200,
            message: "Purchase order retrieved successfully",
            data: order,
          });
        } else {
          resolve({
            code: 404,
            message: "Purchase order not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, purchaseOrderData, items, shouldGeneratePdf = false) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if order exists first
        const existingOrder = await this.purchaseOrderRepo.getById(id);
        if (!existingOrder) {
          resolve({
            code: 404,
            message: "Purchase order not found",
          });
          return;
        }

        const oldStatus = existingOrder.status;
        const newStatus = purchaseOrderData.status;

        await this.purchaseOrderRepo.update(id, purchaseOrderData, items);

        // If status changed to "purchased", increase material stock
        if (
          newStatus === "purchased" &&
          oldStatus !== "purchased" &&
          this.materialsUsecase
        ) {
          try {
            // Fetch the updated order to get current items
            const updatedOrder = await this.purchaseOrderRepo.getById(id);
            const itemsToProcess = updatedOrder?.items || [];

            // Increase stock for each item
            for (const item of itemsToProcess) {
              if (item.material_id && item.quantity) {
                await this.materialsUsecase.increaseStock(
                  item.material_id,
                  item.quantity
                );
              }
            }
          } catch (stockErr) {
            console.error("Stock update error:", stockErr);
            // Log error but don't fail the request
          }
        }

        const result = {
          code: 200,
          message: "Purchase order updated successfully",
          data: { purchase_order_id: id },
        };

        // Generate PDF if requested
        if (shouldGeneratePdf && this.pdfService) {
          try {
            const purchaseOrder = await this.purchaseOrderRepo.getById(id);
            if (purchaseOrder) {
              // Generate PDF using pdf.js service
              const pdfResult = await this.pdfService.generatePurchaseOrderPDF(
                purchaseOrder,
                purchaseOrder.vendor // Pass vendor info from joined data
              );

              // Save PDF record to database
              await this.purchaseOrderRepo.savePdf(
                id,
                pdfResult.pdf_path,
                pdfResult.pdf_filename
              );

              result.data.pdf = {
                pdf_url: pdfResult.pdf_url,
                pdf_filename: pdfResult.pdf_filename,
                s3_url: pdfResult.s3_url || null,
              };
            }
          } catch (pdfErr) {
            // Log PDF error but don't fail the request
            console.error("PDF generation error:", pdfErr);
            result.pdf_generation_error = pdfErr.message;
          }
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if order exists first
        const existingOrder = await this.purchaseOrderRepo.getById(id);
        if (!existingOrder) {
          resolve({
            code: 404,
            message: "Purchase order not found",
          });
          return;
        }

        await this.purchaseOrderRepo.delete(id);
        resolve({
          code: 200,
          message: "Purchase order deleted successfully",
          data: { purchase_order_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (purchaseOrderRepo, materialsUsecase) => {
  return new PurchaseOrderUsecase(purchaseOrderRepo, materialsUsecase);
};
