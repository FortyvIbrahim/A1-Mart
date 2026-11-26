const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const S3 = require("./s3");
const { uuid } = require("uuidv4");

class PDFService {
  constructor() {
    // Queue system for PDF generation - allows maximum 2 tasks (waiting + processing)
    this.queue = [];
    this.activeTasks = 0;
    this.maxTasks = 3;
  }

  /**
   * Add a PDF generation task to the queue
   * @param {Function} task - The PDF generation function to execute
   * @returns {Promise} - Promise that resolves when the task completes
   */
  async enqueue(task) {
    return new Promise((resolve, reject) => {
      // Check if queue is full (active tasks + queue length >= maxTasks)
      if (this.activeTasks + this.queue.length >= this.maxTasks) {
        logger.Log({
          level: logger.LEVEL.WARN,
          component: "SERVICE",
          code: "SERVICE.PDF.QUEUE_FULL",
          description: "PDF generation queue is full, rejecting new task",
          category: "",
          ref: {
            active_tasks: this.activeTasks,
            queue_length: this.queue.length,
            max_tasks: this.maxTasks,
          },
        });
        reject(
          new Error(
            `PDF generation queue is full. Maximum ${this.maxTasks} tasks allowed. Please try again later.`
          )
        );
        return;
      }

      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the queue - executes up to maxTasks concurrently
   */
  async processQueue() {
    // Don't process if queue is empty or we've reached max concurrent tasks
    if (this.queue.length === 0 || this.activeTasks >= this.maxTasks) {
      return;
    }

    // Process tasks up to the limit
    while (this.queue.length > 0 && this.activeTasks < this.maxTasks) {
      const { task, resolve, reject } = this.queue.shift();
      this.activeTasks++;

      // Execute task asynchronously (don't await here to allow concurrent processing)
      this.executeTask(task, resolve, reject);
    }
  }

  /**
   * Execute a single task
   */
  async executeTask(task, resolve, reject) {
    try {
      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.QUEUE_START",
        description: "Starting PDF generation from queue",
        category: "",
        ref: {
          queue_length: this.queue.length,
          active_tasks: this.activeTasks,
        },
      });

      const result = await task();
      resolve(result);

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.QUEUE_COMPLETE",
        description: "PDF generation completed from queue",
        category: "",
        ref: {
          queue_length: this.queue.length,
          active_tasks: this.activeTasks - 1,
        },
      });
    } catch (error) {
      logger.Log({
        level: logger.LEVEL.ERROR,
        component: "SERVICE",
        code: "SERVICE.PDF.QUEUE_ERROR",
        description: "PDF generation error in queue",
        category: "",
        ref: {
          error: error.toString(),
          queue_length: this.queue.length,
          active_tasks: this.activeTasks - 1,
        },
      });
      reject(error);
    } finally {
      this.activeTasks--;
      // Process next item in queue
      this.processQueue();
    }
  }
  // Helper function to get CSS size mappings
  getCSSSizeMapping(size) {
    const sizeMap = {
      xs: {
        fontSize: "8px",
        headerFontSize: "10px",
        cellPadding: "2px",
        tableMargin: "5px",
        titleFontSize: "14px",
      },
      sm: {
        fontSize: "10px",
        headerFontSize: "12px",
        cellPadding: "4px",
        tableMargin: "8px",
        titleFontSize: "16px",
      },
      md: {
        fontSize: "12px",
        headerFontSize: "14px",
        cellPadding: "6px",
        tableMargin: "10px",
        titleFontSize: "18px",
      },
      lg: {
        fontSize: "14px",
        headerFontSize: "16px",
        cellPadding: "8px",
        tableMargin: "12px",
        titleFontSize: "20px",
      },
    };
    return sizeMap[size] || sizeMap.md;
  }

  // Helper function to validate orientation
  getOrientation(orientation) {
    return orientation === "portrait" ? false : true; // landscape is default
  }

  // Helper function to validate margin size
  getMarginSize(marginSize) {
    // Validate margin size format (should be like "15mm", "20px", etc.)
    if (
      typeof marginSize === "string" &&
      /^\d+(mm|px|in|cm)$/.test(marginSize)
    ) {
      return marginSize;
    }
    return "15mm"; // default fallback
  }

  async generateCleaningPackingTablePDF(
    dataArray,
    headersMapping,
    pdfName = null,
    customTitle = null,
    size = "md",
    orientation = "landscape",
    marginSize = "15mm"
  ) {
    return this.enqueue(async () => {
      return this._generateCleaningPackingTablePDF(
        dataArray,
        headersMapping,
        pdfName,
        customTitle,
        size,
        orientation,
        marginSize
      );
    });
  }

  async _generateCleaningPackingTablePDF(
    dataArray,
    headersMapping,
    pdfName = null,
    customTitle = null,
    size = "md",
    orientation = "landscape",
    marginSize = "15mm"
  ) {
    let browser;
    try {
      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.GENERATE_CLEANING_PACKING_START",
        description: "Starting PDF generation",
        category: "",
        ref: { data_count: dataArray?.length || 0 },
      });

      browser = await puppeteer.launch({
        headless: "new",
        dumpio: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--disable-background-networking",
          "--disable-extensions",
          "--disable-software-rasterizer",
          "--disable-sync",
          "--disable-translate",
          "--disable-default-apps",
          "--disable-features=site-per-process,IsolateOrigins",
          "--js-flags=--lite-mode",
        ],
        timeout: 30000,
      });

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.BROWSER_LAUNCHED",
        description: "Browser launched successfully",
        category: "",
        ref: {},
      });

      const page = await browser.newPage();

      // Calculate CSS size mapping before HTML generation
      const cssSizeMapping = this.getCSSSizeMapping(size);

      // Generate HTML content for the cleaning packing table
      const htmlContent = this.generateCleaningPackingTableHTML(
        dataArray,
        headersMapping,
        customTitle,
        cssSizeMapping
      );

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.HTML_GENERATED",
        description: "HTML content generated",
        category: "",
        ref: { html_length: htmlContent.length },
      });

      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.CONTENT_LOADED",
        description: "Content loaded in browser",
        category: "",
        ref: {},
      });

      // Generate PDF with dynamic props
      const isLandscape = this.getOrientation(orientation);
      const margin = this.getMarginSize(marginSize);

      const pdfBuffer = await page.pdf({
        format: "A4", // Fixed to A4, size controls CSS styling instead
        printBackground: true,
        margin: {
          top: margin,
          right: margin,
          bottom: margin,
          left: margin,
        },
        preferCSSPageSize: false,
        landscape: isLandscape,
      });

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.GENERATED",
        description: "PDF generated successfully",
        category: "",
        ref: { pdf_size: pdfBuffer.length },
      });

      // Save PDF to views folder with custom name or default date-based name
      let pdfFilename;
      if (pdfName) {
        // Use custom name, ensure it has .pdf extension
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        pdfFilename = pdfName.endsWith(".pdf")
          ? `${pdfName}`
          : `${pdfName}-${today}.pdf`;
      } else {
        // Default to date-based naming
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        pdfFilename = `cleaning-packing-report-${today}.pdf`;
      }
      const pdfPath = path.join(__dirname, "..", "views", pdfFilename);

      // Ensure views directory exists
      const viewsDir = path.join(__dirname, "..", "views");
      if (!fs.existsSync(viewsDir)) {
        fs.mkdirSync(viewsDir, { recursive: true });
      }

      fs.writeFileSync(pdfPath, pdfBuffer);

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.SAVED",
        description: `PDF saved to ${pdfPath}`,
        category: "",
        ref: { pdf_path: pdfPath, pdf_size: pdfBuffer.length },
      });

      await page.close();
      await browser.close();

      // Return the file URL instead of buffer
      return `views/${pdfFilename}`;
    } catch (error) {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE",
            code: "SERVICE.PDF.BROWSER_CLOSE_ERROR",
            description: e.toString(),
            category: "",
            ref: {},
          });
        }
      }
      logger.Log({
        level: logger.LEVEL.ERROR,
        component: "SERVICE",
        code: "SERVICE.PDF.GENERATE_CLEANING_PACKING_ERROR",
        description: error.toString(),
        category: "",
        ref: {
          data_count: dataArray?.length || 0,
          error_stack: error.stack,
        },
      });
      throw error;
    }
  }

  async generateTablePDFToS3(
    dataArray,
    headersMapping,
    pdfName = null,
    customTitle = null,
    size = "md",
    orientation = "landscape",
    marginSize = "15mm",
    s3Folder = "pdfs"
  ) {
    return this.enqueue(async () => {
      return this._generateTablePDFToS3(
        dataArray,
        headersMapping,
        pdfName,
        customTitle,
        size,
        orientation,
        marginSize,
        s3Folder
      );
    });
  }

  async _generateTablePDFToS3(
    dataArray,
    headersMapping,
    pdfName = null,
    customTitle = null,
    size = "md",
    orientation = "landscape",
    marginSize = "15mm",
    s3Folder = "pdfs"
  ) {
    let browser;
    try {
      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.GENERATE_TABLE_PDF_TO_S3_START",
        description: "Starting PDF generation for S3",
        category: "",
        ref: { data_count: dataArray?.length || 0 },
      });

      browser = await puppeteer.launch({
        headless: "new",
        dumpio: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--disable-background-networking",
          "--disable-extensions",
          "--disable-software-rasterizer",
          "--disable-sync",
          "--disable-translate",
          "--disable-default-apps",
          "--disable-features=site-per-process,IsolateOrigins",
          "--js-flags=--lite-mode",
        ],
        timeout: 30000,
      });

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.BROWSER_LAUNCHED",
        description: "Browser launched successfully",
        category: "",
        ref: {},
      });

      const page = await browser.newPage();

      // Calculate CSS size mapping before HTML generation
      const cssSizeMapping = this.getCSSSizeMapping(size);

      // Generate HTML content for the table
      const htmlContent = this.generateCleaningPackingTableHTML(
        dataArray,
        headersMapping,
        customTitle,
        cssSizeMapping
      );

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.HTML_GENERATED",
        description: "HTML content generated",
        category: "",
        ref: { html_length: htmlContent.length },
      });

      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.CONTENT_LOADED",
        description: "Content loaded in browser",
        category: "",
        ref: {},
      });

      // Generate PDF with dynamic props
      const isLandscape = this.getOrientation(orientation);
      const margin = this.getMarginSize(marginSize);

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: margin,
          right: margin,
          bottom: margin,
          left: margin,
        },
        preferCSSPageSize: false,
        landscape: isLandscape,
      });

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.GENERATED",
        description: "PDF generated successfully",
        category: "",
        ref: { pdf_size: pdfBuffer.length },
      });

      await page.close();
      await browser.close();

      // Generate PDF filename
      let pdfFilename;
      if (pdfName) {
        // Use custom name, ensure it has .pdf extension
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        pdfFilename = pdfName.endsWith(".pdf")
          ? `${s3Folder}/${pdfName}`
          : `${s3Folder}/${pdfName}-${today}.pdf`;
      } else {
        // Default to date-based naming
        const timestamp = Date.now();
        pdfFilename = `${s3Folder}/pdf-report-${timestamp}.pdf`;
      }

      // Upload PDF buffer directly to S3
      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.S3_UPLOAD_START",
        description: "Uploading PDF to S3",
        category: "",
        ref: { s3_filename: pdfFilename },
      });

      const s3Url = await S3.uploadFile(
        undefined,
        pdfFilename,
        "application/pdf",
        pdfBuffer
      );

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.S3_UPLOADED",
        description: "PDF uploaded to S3 successfully",
        category: "",
        ref: { s3_url: s3Url, pdf_filename: pdfFilename },
      });

      return {
        pdf_url: s3Url,
        pdf_filename: pdfFilename,
        s3_url: s3Url,
        date: new Date().toISOString().split("T")[0],
        record_count: dataArray.length,
      };
    } catch (error) {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE",
            code: "SERVICE.PDF.BROWSER_CLOSE_ERROR",
            description: e.toString(),
            category: "",
            ref: {},
          });
        }
      }
      logger.Log({
        level: logger.LEVEL.ERROR,
        component: "SERVICE",
        code: "SERVICE.PDF.GENERATE_TABLE_PDF_TO_S3_ERROR",
        description: error.toString(),
        category: "",
        ref: {
          data_count: dataArray?.length || 0,
          error_stack: error.stack,
        },
      });
      throw error;
    }
  }

  generateCleaningPackingTableHTML(
    dataArray,
    headersMapping,
    customTitle = null,
    cssSizeMapping = null
  ) {
    if (!dataArray || dataArray.length === 0) {
      return this.generateEmptyTableHTML();
    }

    // Get the date from the first item
    const firstItemDate =
      dataArray[0]?.order_date || dataArray[0]?.created_at || "";

    const formatDate = (dateString) => {
      if (!dateString || dateString === "") return "";
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch (e) {
        return "";
      }
    };

    // Escape HTML to prevent issues
    const escapeHtml = (text) => {
      if (text === null || text === undefined) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    // Generate table headers
    const tableHeaders = Object.keys(headersMapping)
      .map((key) => `<th>${escapeHtml(headersMapping[key])}</th>`)
      .join("");

    console.log(dataArray);

    // Generate table rows
    const tableRows = dataArray
      .map((item, index) => {
        const cells = Object.keys(headersMapping)
          .map((key) => {
            const value = item[key] || "";
            const headerName = headersMapping[key] || "";
            const isImageColumn =
              key.toLowerCase().includes("image") ||
              headerName.toLowerCase().includes("image");

            if (isImageColumn && value) {
              // Render as image
              return `<td style="text-align: center; padding: 8px;">
                <img src="${escapeHtml(
                value
              )}" alt="" style="max-width: 100px; max-height: 100px; object-fit: contain;" onerror="this.style.display='none';" />
              </td>`;
            } else {
              // Render as text
              return `<td>${escapeHtml(value)}</td>`;
            }
          })
          .join("");

        return `<tr class="${index % 2 === 0 ? "even" : "odd"}">
        ${cells}
      </tr>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${customTitle || "Cleaning & Packing Report"}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Times New Roman, sans-serif;
            font-size: ${cssSizeMapping?.fontSize || "12px"};
            line-height: 1.4;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
        }
        
        .container {
            max-width: 100%;
            margin: 0;
            padding: 0;
        }
        
        .header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #333;
        }
        
        .report-title {
            font-size: ${cssSizeMapping?.titleFontSize || "16px"};
            font-weight: bold;
            color: #333;
            white-space: nowrap;
        }
        
        .report-date {
            font-size: ${cssSizeMapping?.headerFontSize || "10px"};
            color: #666;
            white-space: nowrap;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            margin: ${cssSizeMapping?.tableMargin || "10px"};
        }
        
        .data-table th {
            background-color: #333;
            color: white;
            padding: ${cssSizeMapping?.cellPadding || "12px"} ${cssSizeMapping?.cellPadding || "8px"
      };
            text-align: left;
            font-weight: bold;
            border: 1px solid #333;
            font-size: ${cssSizeMapping?.headerFontSize || "14px"};
        }
        
        .data-table td {
            padding: ${cssSizeMapping?.cellPadding || "10px"} ${cssSizeMapping?.cellPadding || "8px"
      };
            border: 1px solid #ddd;
            vertical-align: top;
        }
        
        .data-table tr.even {
            background-color: #f9f9f9;
        }
        
        .data-table tr.odd {
            background-color: #fff;
        }
        
        .summary {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
        }
        
        .summary-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        
        .footer {
            margin-top: 8px;
            text-align: center;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 4px;
            white-space: nowrap;
        }
        
        @media print {
            body { margin: 0; }
            .container { padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="report-title">${customTitle || "Cleaning & Packing Report"
      }</div>
            ${firstItemDate
        ? `<div class="report-date">Date: ${formatDate(
          firstItemDate
        )}</div>`
        : ""
      }
        </div>
        
        <table class="data-table">
            <thead>
                <tr>
                    ${tableHeaders}
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
      
        <div class="footer">
            Generated using A1Mart Connect
        </div>
    </div>
</body>
</html>`;
  }

  generateEmptyTableHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cleaning & Packing Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 40px;
            color: #000;
            background-color: #ffffff;
            text-align: center;
        }
        
        .empty-message {
            font-size: 18px;
            color: #666;
            margin-top: 100px;
        }
    </style>
</head>
<body>
    <div class="empty-message">
        No data available for Cleaning & Packing Report
    </div>
</body>
</html>`;
  }

  async generatePurchaseOrderPDF(purchaseOrder, vendorInfo = null) {
    return this.enqueue(async () => {
      return this._generatePurchaseOrderPDF(purchaseOrder, vendorInfo);
    });
  }

  async _generatePurchaseOrderPDF(purchaseOrder, vendorInfo = null) {
    let browser;
    try {
      const purchaseOrderConfig = require("../config/purchaseOrder.json");

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.GENERATE_PURCHASE_ORDER_START",
        description: "Starting Purchase Order PDF generation",
        category: "",
        ref: { purchase_order_id: purchaseOrder.purchase_order_id },
      });

      browser = await puppeteer.launch({
        headless: "new",
        dumpio: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--disable-background-networking",
          "--disable-extensions",
          "--disable-software-rasterizer",
          "--disable-sync",
          "--disable-translate",
          "--disable-default-apps",
          "--disable-features=site-per-process,IsolateOrigins",
          "--js-flags=--lite-mode",
        ],
        timeout: 30000,
      });

      const page = await browser.newPage();

      const htmlContent = this.generatePurchaseOrderHTML(
        purchaseOrder,
        vendorInfo,
        purchaseOrderConfig
      );

      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "15mm",
          right: "15mm",
          bottom: "15mm",
          left: "15mm",
        },
        preferCSSPageSize: false,
        landscape: false,
      });

      await page.close();
      await browser.close();

      // Upload PDF directly to S3 (no local file saving)
      const pdfFilename = `PO_${purchaseOrder.purchase_order_id
        }_${Date.now()}.pdf`;
      const s3FileName = `purchase-orders/${pdfFilename}`;

      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE",
        code: "SERVICE.PDF.PURCHASE_ORDER_GENERATED",
        description: `Purchase Order PDF generated successfully`,
        category: "",
        ref: { pdf_size: pdfBuffer.length, pdf_filename: pdfFilename },
      });

      // Upload PDF buffer directly to S3
      let s3Url = null;
      try {
        s3Url = await S3.uploadFile(
          undefined,
          s3FileName,
          "application/pdf",
          pdfBuffer
        );
        logger.Log({
          level: logger.LEVEL.INFO,
          component: "SERVICE",
          code: "SERVICE.PDF.PURCHASE_ORDER_S3_UPLOADED",
          description: `Purchase Order PDF uploaded to S3 successfully`,
          category: "",
          ref: { s3_url: s3Url, pdf_filename: pdfFilename },
        });
      } catch (s3Err) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE",
          code: "SERVICE.PDF.PURCHASE_ORDER_S3_UPLOAD_ERROR",
          description: `Failed to upload PDF to S3: ${s3Err.toString()}`,
          category: "",
          ref: { pdf_filename: pdfFilename, error: s3Err.message },
        });
        throw s3Err; // Throw error if S3 upload fails since we have no local backup
      }

      return {
        pdf_path: s3Url, // S3 URL stored in pdf_path
        pdf_url: s3Url, // S3 URL for accessing the PDF
        pdf_filename: pdfFilename,
        s3_url: s3Url, // Include S3 URL separately for reference
      };
    } catch (error) {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE",
            code: "SERVICE.PDF.BROWSER_CLOSE_ERROR",
            description: e.toString(),
            category: "",
            ref: {},
          });
        }
      }
      logger.Log({
        level: logger.LEVEL.ERROR,
        component: "SERVICE",
        code: "SERVICE.PDF.GENERATE_PURCHASE_ORDER_ERROR",
        description: error.toString(),
        category: "",
        ref: {
          purchase_order_id: purchaseOrder?.purchase_order_id,
          error_stack: error.stack,
        },
      });
      throw error;
    }
  }

  generatePurchaseOrderHTML(purchaseOrder, vendorInfo, purchaseOrderConfig) {
    const escapeHtml = (text) => {
      if (text === null || text === undefined) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    const formatDate = (dateString) => {
      if (!dateString) return "";
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch (e) {
        return dateString;
      }
    };

    const formatCurrency = (amount) => {
      if (amount === null || amount === undefined) return "₹ 0.00";
      return `₹ ${parseFloat(amount).toFixed(2)}`;
    };

    // Calculate totals
    let gross = 0;
    let totalGST = 0;
    const items = purchaseOrder.items || [];
    items.forEach((item) => {
      const quantity = parseFloat(item.quantity || 0);
      const rate = parseFloat(item.rate || 0);
      const taxPercentage = parseFloat(item.material?.tax_percentage || 0);
      gross += quantity * rate;
      // Calculate GST: (quantity * rate * tax_percentage) / 100
      totalGST += (quantity * rate * taxPercentage) / 100;
    });

    const discount = parseFloat(purchaseOrder.discount || 0);
    const adjustment = parseFloat(purchaseOrder.adjustment || 0);
    const tax = parseFloat(purchaseOrder.tax || 0);
    // Use calculated GST from items if available, otherwise use stored tax
    const finalGST = totalGST > 0 ? totalGST : tax;
    const net = gross - discount + adjustment + finalGST;

    // Build items table rows
    const itemRows = items
      .map((item, index) => {
        const materialName = item.material?.name || `[${item.material_id}]`;
        const cost = formatCurrency(item.rate);
        const qty = item.quantity;
        const imageUrl = item.material?.image_url || null;
        const taxPercentage = parseFloat(item.material?.tax_percentage || 0);
        const quantity = parseFloat(item.quantity || 0);
        const rate = parseFloat(item.rate || 0);
        // Calculate GST amount for this item: (quantity * rate * tax_percentage) / 100
        const gstAmount = (quantity * rate * taxPercentage) / 100;
        const gstPercentageDisplay =
          taxPercentage > 0 ? `${taxPercentage.toFixed(2)}%` : "-";
        const gstAmountDisplay = formatCurrency(gstAmount);

        // Create image HTML if image_url exists
        const imageHtml =
          imageUrl && imageUrl.trim() !== ""
            ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(
              materialName
            )}" class="material-image" />`
            : `<div class="material-image-placeholder">No Image</div>`;

        return `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">
            <div class="material-name-cell">
              ${imageHtml}
              <span>${index + 1}. ${escapeHtml(materialName)}</span>
            </div>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
            ${escapeHtml(cost)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
            ${escapeHtml(qty)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
            ${escapeHtml(gstPercentageDisplay)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
            ${escapeHtml(gstAmountDisplay)}
          </td>
        </tr>`;
      })
      .join("");

    // Company info
    const logoUrl = purchaseOrderConfig.logo_url || "";
    const companyName = escapeHtml(purchaseOrderConfig.company_name || "");
    const companyPhone = escapeHtml(purchaseOrderConfig.phone || "");
    const companyEmail = escapeHtml(purchaseOrderConfig.email || "");
    const companyAddress = purchaseOrderConfig.address || {};
    const companyGst = escapeHtml(purchaseOrderConfig.gst_number || "");
    const warehouseAddress = escapeHtml(companyAddress.warehouse || "");
    const companyCityState = escapeHtml(
      `${companyAddress.city || ""}, ${companyAddress.state || ""}-${companyAddress.pincode || ""
        }`
        .replace(/^,\s*/, "")
        .replace(/,\s*$/, "")
    );

    // PO info
    const poRef = escapeHtml(
      purchaseOrder.purchase_order_ref || purchaseOrder.purchase_order_id
    );
    const poDate = formatDate(purchaseOrder.date || new Date());

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Order #${poRef}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #000;
            background: #fff;
            padding: 20px;
        }
        
        .header {
            margin-bottom: 10px;
        }
        
        .company-logo {
            max-width: 200px;
            max-height: 80px;
            margin-bottom: 10px;
            object-fit: contain;
        }
        
        .company-details {
            margin-top: 10px;
            font-size: 11px;
        }
        
        .po-info {
            margin-top: 20px;
            margin-bottom: 20px;
        }
        
        .bill-to {
            margin: 30px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
        }
        
        .bill-to-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .summary {
            margin: 30px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
        }
        
        .summary-line {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 13px;
        }
        
        .summary-label {
            font-weight: bold;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .items-table th {
            background-color: #f0f0f0;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #333;
            font-weight: bold;
        }
        
        .items-table td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
            vertical-align: middle;
        }
        
        .material-image {
            max-width: 60px;
            max-height: 60px;
            width: auto;
            height: auto;
            object-fit: contain;
            vertical-align: middle;
            margin-right: 10px;
            background-color: #fff;
        }
        
        .material-image-placeholder {
            width: 60px;
            height: 60px;
            background-color: #f5f5f5;
            display: inline-block;
            vertical-align: middle;
            margin-right: 10px;
            text-align: center;
            line-height: 60px;
            color: #999;
            font-size: 9px;
            border-radius: 4px;
        }
        
        .material-name-cell {
            display: flex;
            align-items: center;
            min-height: 60px;
        }
        
        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            margin-bottom: 30px;
        }
        
        .signature-box {
            width: 45%;
        }
        
        .signature-label {
            font-weight: bold;
            margin-bottom: 40px;
        }
        
        .signature-line {
            border-top: 1px solid #333;
            padding-top: 5px;
        }
        
        .footer {
            margin-top: 10px;
            padding-top: 6px;
            border-top: 1px solid #ddd;
            font-size: 9px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        ${logoUrl
        ? `<img src="${escapeHtml(
          logoUrl
        )}" alt="Company Logo" class="company-logo" />`
        : ""
      }
        <div class="company-details">
            #${poRef}, warehouse<br>
            Date: ${poDate}<br>
            ${companyPhone ? `Phone: ${companyPhone}<br>` : ""}
            ${companyEmail ? `Email: ${companyEmail}` : ""}
        </div>
    </div>
    
    <div class="bill-to">
        <div class="bill-to-title"># BILL TO</div>
        ${companyName ? `<div>${companyName}</div>` : ""}
        ${warehouseAddress ? `<div>${warehouseAddress}</div>` : ""}
        ${companyCityState ? `<div>${companyCityState}</div>` : ""}
        ${companyGst ? `<div>${companyGst}</div>` : ""}
    </div>
    
    <div class="summary">
        <div style="margin-bottom: 10px;">
            This purchase order is an intent to procure ${items.length
      } article${items.length !== 1 ? "s" : ""
      } listed in the following pages. PS: GST and Landing Cost (Net Cost) consider discounts seen in the last delivery.
        </div>
        <div class="summary-line">
            <span class="summary-label">Gross:</span>
            <span>${formatCurrency(gross)}</span>
        </div>
        <div class="summary-line">
            <span class="summary-label">GST:</span>
            <span>${formatCurrency(finalGST)}</span>
        </div>
        <div class="summary-line">
            <span class="summary-label">Net:</span>
            <span>${formatCurrency(net)}</span>
        </div>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th>PRODUCT NAME</th>
                <th style="text-align: right;">COST</th>
                <th style="text-align: right;">QTY</th>
                <th style="text-align: right;">GST%</th>
                <th style="text-align: right;">GST</th>
            </tr>
        </thead>
        <tbody>
            ${itemRows}
        </tbody>
    </table>
    
    <div class="signatures">
        <div class="signature-box">
            <div class="signature-label">SIGN HERE</div>
            <div class="signature-line">Prepared By<br>(Purchase Head)</div>
        </div>
        <div class="signature-box">
            <div class="signature-label">SIGN HERE</div>
            <div class="signature-line">Approved By<br>(Business Head)</div>
        </div>
    </div>
    
    <div class="footer">
        <div class="footer-title"># IMPORTANT - PLEASE READ</div>
        <div class="footer-text">
            Make sure to follow the purchase terms and conditions to avoid unwanted misunderstanding at a later point in time. Reach out to us in case of any clarifications or modifications to this purchase order.
        </div>
        <div class="footer-text" style="margin-top: 15px; text-align: center;">
            Generated using A1Mart Connect - #${poRef}, Created: ${formatDate(
        new Date()
      )}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate payslip PDF for a payroll_employee. Saves to views/payslips/<payroll_employee_id>.pdf.
   * @param {Object} payslipData - Payroll employee row with payroll, employee, payment_details
   * @returns {Promise<string>} Path like "views/payslips/123.pdf"
   */
  async generatePayslipPDF(payslipData) {
    return this.enqueue(async () => {
      return this._generatePayslipPDF(payslipData);
    });
  }

  _getPayslipS3Folder(payrollMonth) {
    if (!payrollMonth) return "payslips";
    const d = new Date(payrollMonth);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    return `payslips/${monthName}`;
  }

  async _generatePayslipPDF(payslipData) {
    let browser;
    const id = payslipData.payroll_employee_id;
    const payrollMonth = payslipData.payroll?.payroll_month;
    const s3Folder = this._getPayslipS3Folder(payrollMonth);
    const s3Key = `${s3Folder}/payslip-${id}-${uuid()}.pdf`;

    try {
      browser = await puppeteer.launch({
        headless: "new",
        dumpio: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
        ],
        timeout: 30000,
      });

      const page = await browser.newPage();
      const htmlContent = this._generatePayslipHTML(payslipData);
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "8mm", right: "10mm", bottom: "8mm", left: "10mm" },
      });

      await page.close();
      await browser.close();

      const s3Url = await S3.uploadFile(null, s3Key, "application/pdf", pdfBuffer);
      return s3Url;
    } catch (error) {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // ignore
        }
      }
      logger.Log({
        level: logger.LEVEL.ERROR,
        component: "SERVICE",
        code: "SERVICE.PDF.GENERATE_PAYSLIP_ERROR",
        description: error.toString(),
        category: "",
        ref: { payroll_employee_id: id },
      });
      throw error;
    }
  }

  _generatePayslipHTML(data) {
    const emp = data.employee || {};
    const pd = data.payment_details || {};
    const parse = (n) => (n != null && n !== "" ? parseFloat(n) : 0) || 0;
    const round2 = (n) => Math.round(Number(parse(n)) * 100) / 100;
    const grossPay = round2(data.gross_pay);
    const overtimeAmt = round2(data.overtime_amt);
    const latenessAmt = round2(data.lateness_amt);
    const actualPay = round2(data.actual_pay);
    const incentive = round2(data.incentive);
    const lopAmount = round2(data.lop_amount);
    const advance = round2(data.advance);
    const penalty = round2(data.penalty);
    const employeeEsi = round2(data.employee_esi);
    const employeeEpf = round2(data.employee_epf);
    const employerEsi = round2(data.employer_esi);
    const employerEpf = round2(data.employer_epf);
    const totalDeduction = round2(lopAmount + latenessAmt + advance + penalty + employeeEsi + employeeEpf);
    // Staff welfare = employer ESI + employer EPF
    const staffWelfare = round2(employerEsi + employerEpf);
    // Net payable account pay = gross pay - total deductions
    const netPayableAccountPay = round2(grossPay - totalDeduction).toFixed(0);
    // Total from A1 Mart = gross pay + staff welfare
    const totalFromA1Mart = round2(grossPay + staffWelfare).toFixed(0);

    const payrollMonth = data.payroll?.payroll_month
      ? new Date(data.payroll.payroll_month).toLocaleString("en-IN", { month: "long", year: "numeric" })
      : "";

    const fmt = (n) => (n != null && n !== "" ? Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-");
    const str = (v) => (v != null && v !== "" ? String(v) : "-");
    // Working days / LOP days: no .00 for whole numbers; show decimals only if present
    const fmtDays = (n) => {
      if (n == null || n === "") return "-";
      const v = Number(n);
      if (Number.isNaN(v)) return "-";
      return v % 1 === 0 ? String(Math.round(v)) : String(v);
    };

    const primary = "#ee7a30";
    const primaryDark = "#d96a28";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    html { overflow-x: hidden; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 10px; color: #1a1a1a; margin: 0; padding: 0 4px; line-height: 1.3; max-width: 100%; overflow-x: hidden; }
    .header { text-align: center; background: linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%); color: #fff; padding: 10px 14px; }
    .header h1 { margin: 0 0 1px 0; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; }
    .header .sub { font-size: 9px; opacity: 0.95; }
    .payslip-title { text-align: center; padding: 8px; font-size: 13px; font-weight: 700; background: #f5f5f5; border-bottom: 2px solid ${primary}; letter-spacing: 0.3px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #ccc; font-size: 10px; }
    .info-table th { text-align: left; background: #f5f5f5; color: #444; font-weight: 600; padding: 5px 8px; border: 1px solid #e0e0e0; width: 1%; white-space: nowrap; font-size: 9px; text-transform: uppercase; letter-spacing: 0.2px; }
    .info-table td { padding: 5px 8px; border: 1px solid #e0e0e0; background: #fff; }
    .section-box { border: 1px solid #ccc; margin-bottom: 8px; }
    .section-head { background: ${primary}; color: #fff; padding: 5px 8px; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
    .section-body table { width: 100%; border-collapse: collapse; }
    .section-body th, .section-body td { border: 1px solid #e0e0e0; padding: 5px 8px; text-align: left; font-size: 10px; }
    .section-body th { background: #f8f8f8; font-weight: 600; color: #333; }
    .section-body .amount { text-align: right; font-family: 'Consolas', 'Monaco', monospace; }
    .earnings-total { background: #e8f5e9 !important; font-weight: 700; font-size: 11px; }
    .deductions-total { background: #ffebee !important; font-weight: 700; font-size: 11px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .summary-table { width: 100%; border-collapse: collapse; border: 1px solid #ccc; margin-bottom: 8px; font-size: 10px; }
    .summary-table th, .summary-table td { padding: 6px 8px; border: 1px solid #e0e0e0; }
    .summary-table th { background: #f8f8f8; font-weight: 600; }
    .summary-table .amount { text-align: right; font-family: 'Consolas', 'Monaco', monospace; }
    .net-payable-box { margin-bottom: 12px; border: 2px solid #d96a28; background: #fff3e0 !important; padding: 12px 14px; text-align: right; }
    .net-payable-box .label { font-size: 12px; font-weight: 700; color: #bf360c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .net-payable-box .value { font-size: 18px; font-weight: 700; color: #bf360c; font-family: 'Consolas', 'Monaco', monospace; }
    .total-a1mart { background: #fff3e0 !important; font-weight: 700; font-size: 11px; }
    .staff-welfare-section th { background: #fff8e1 !important; }
    .footer-note { margin-top: 8px; padding-top: 6px; border-top: 1px solid #ddd; font-size: 8px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>A ONE MART RETAIL PRIVATE LIMITED</h1>
    <div class="sub">Pay Slip</div>
  </div>
  <div class="payslip-title">PAYSLIP FOR ${str(payrollMonth)}</div>

  <table class="info-table">
    <tr><th>Name</th><td>${str(emp.employee_name)}</td><th>Employee ID</th><td>${str(emp.employee_code)}</td></tr>
    <tr><th>Designation</th><td>${str(emp.designation_name)}</td><th>Department</th><td>${str(emp.department_name)}</td></tr>
    <tr><th>No. of Days</th><td>${str(data.days_per_month)}</td><th>Working Days</th><td>${fmtDays(data.no_of_working_days)}</td></tr>
    <tr><th>LOP Days</th><td>${fmtDays(data.lop_days)}</td><th>LATE/EARLY HOURS</th><td>${str(data.late_early_hours != null ? Number(data.late_early_hours).toFixed(2) : null)}</td></tr>
    ${pd != null && typeof pd === "object"
        ? `<tr><th>Beneficiary</th><td>${str(pd.beneficiary)}</td><th>Payment Method</th><td>${String(pd.mode).toLowerCase() === "cash" ? "Cash" : "Bank"}</td></tr>
    <tr><th>Bank A/c No.</th><td>${str(emp.account_no)}</td><th>Payment Date</th><td>${str(pd.payment_date != null && pd.payment_date !== '' ? (typeof pd.payment_date === 'string' ? pd.payment_date.split('T')[0] : new Date(pd.payment_date).toISOString().split('T')[0]) : null)}</td></tr>
    <tr><th>IFSC Code</th><td>${str(emp.ifsc_code)}</td><th>UTR</th><td>${str(pd.utr)}</td></tr>`
        : `<tr><th>Payment Status</th><td colspan="3">Payment Pending</td></tr>
    <tr><th>IFSC Code</th><td colspan="3">${str(emp.ifsc_code)}</td></tr>`}
    ${emp.pf_uan != null && String(emp.pf_uan).trim() !== "" ? `<tr><th>PF UAN</th><td>${str(emp.pf_uan)}</td><th></th><td></td></tr>` : ""}
  </table>

  <div class="two-col">
    <div class="section-box">
      <div class="section-head">Earnings</div>
      <div class="section-body">
        <table>
          <tr><th>Actual Pay</th><td class="amount">${fmt(actualPay)}</td></tr>
          <tr><th>OverTime Amt</th><td class="amount">${fmt(overtimeAmt)}</td></tr>
          <tr><th>Incentive</th><td class="amount">${fmt(incentive)}</td></tr>
          <tr class="earnings-total"><th>Gross Pay</th><td class="amount">${fmt(grossPay)}</td></tr>
        </table>
      </div>
    </div>
    <div class="section-box">
      <div class="section-head">Deductions</div>
      <div class="section-body">
        <table>
          <tr><th>LOP Amount</th><td class="amount">${fmt(lopAmount)}</td></tr>
          <tr><th>Lateness Amt</th><td class="amount">${fmt(latenessAmt)}</td></tr>
          <tr><th>Advance</th><td class="amount">${fmt(advance)}</td></tr>
          <tr><th>Penalty</th><td class="amount">${fmt(penalty)}</td></tr>
          <tr><th>Employee ESI</th><td class="amount">${fmt(employeeEsi)}</td></tr>
          <tr><th>Employee EPF</th><td class="amount">${fmt(employeeEpf)}</td></tr>
          <tr class="deductions-total"><th>Total Deductions</th><td class="amount">${fmt(totalDeduction)}</td></tr>
        </table>
      </div>
    </div>
  </div>

  <div class="net-payable-box">
    <div class="label">Net Payable (Account Pay)</div>
    <div class="value">₹ ${fmt(netPayableAccountPay)}</div>
  </div>

  <div class="section-box">
    <div class="section-head">Staff Welfare (Employer ESI + EPF)</div>
    <div class="section-body">
      <table class="staff-welfare-section">
        <tr><th>Employer ESI</th><td class="amount">${fmt(employerEsi)}</td></tr>
        <tr><th>Employer EPF</th><td class="amount">${fmt(employerEpf)}</td></tr>
        <tr><th>Total Staff Welfare</th><td class="amount">${fmt(staffWelfare)}</td></tr>
      </table>
    </div>
  </div>

  <table class="summary-table">
    <tr class="total-a1mart"><th>Total From A1 Mart</th><td class="amount">₹ ${fmt(totalFromA1Mart)}</td></tr>
  </table>

  <div class="footer-note">Generated by A1 Mart Connect · Payslip #${str(data.payroll_employee_id)}</div>
</body>
</html>`;
  }
}

module.exports = new PDFService();
