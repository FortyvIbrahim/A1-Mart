class CleaningPackingUsecase {
  constructor(cleaningPackingRepo) {
    this.cleaningPackingRepo = cleaningPackingRepo;
    this.synker = null;
    this.pdfService = null;
  }

  setSynker(synker) {
    this.synker = synker;
  }

  setPdfService(pdfService) {
    this.pdfService = pdfService;
  }

  create(purchaseItem) {
    return new Promise(async (resolve, reject) => {
      try {
        // Validate required fields
        if (!purchaseItem.purchase_item) {
          reject(new Error("purchase_item (primary key) is required"));
          return;
        }
        if (!purchaseItem.purchase_item_name) {
          reject(new Error("purchase_item_name is required"));
          return;
        }

        const result = await this.cleaningPackingRepo.create(purchaseItem);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(filters = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const purchaseItems = await this.cleaningPackingRepo.getAll(filters);
        resolve(purchaseItems);
      } catch (err) {
        reject(err);
      }
    });
  }

  deleteAll() {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.cleaningPackingRepo.deleteAll();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  sync() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.synker || !this.synker.syncCleaningPacking) {
          throw new Error("Synker service not initialised");
        }

        await this.deleteAll();
        await this.synker.syncCleaningPacking();
        resolve({ code: 200 });
      } catch (err) {
        reject(err);
      }
    });
  }

  generatePDF(
    dataArray = [],
    pdfName = null,
    customHeaders = null,
    customTitle = null,
    size = "md",
    orientation = "landscape",
    marginSize = "15mm"
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        // Validate PDF service
        if (!this.pdfService) {
          reject(new Error("PDF service not initialised"));
          return;
        }

        // Validate data array
        if (!Array.isArray(dataArray)) {
          reject(new Error("Data must be an array"));
          return;
        }

        // Validate data
        if (!dataArray || dataArray.length === 0) {
          reject(new Error("No data provided for PDF generation"));
          return;
        }

        // Use custom headers or default headers mapping
        const headersMapping = customHeaders || {
          purchase_item: "Purchase Item ID",
          purchase_item_name: "Item Name",
          article_id: "Article ID",
          article_name: "Article Name",
          priority_score: "Priority Score",
          repackage_conversion: "Repackage Conversion",
          planner: "Planner",
          repack_quantity: "Repack Quantity",
          forecast_quantity: "Forecast Quantity",
          order_date: "Order Date",
          child_stock_in_hand: "Child Stock",
          parent_stock: "Parent Stock",
          store_uom: "Store UOM",
          num_stores_oos: "Stores OOS",
          chain_bill_count_level: "Bill Count Level",
        };

        console.log(`Generating PDF for ${dataArray.length} records`);

        // Generate PDF
        const pdfUrl = await this.pdfService.generateCleaningPackingTablePDF(
          dataArray,
          headersMapping,
          pdfName,
          customTitle,
          size,
          orientation,
          marginSize
        );

        // Validate PDF URL
        if (!pdfUrl) {
          reject(new Error("PDF generation failed - no URL returned"));
          return;
        }

        console.log(`PDF generated successfully and saved to: ${pdfUrl}`);

        resolve({
          pdf_url: pdfUrl,
          filename: pdfUrl.split("/").pop(),
          date: new Date().toISOString().split("T")[0],
          record_count: dataArray.length,
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (cleaningPackingRepo) => {
  return new CleaningPackingUsecase(cleaningPackingRepo);
};
