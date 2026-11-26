import axiosInstance from "..";

/**
 * Generate PDF using the PDF generator API
 * @param {Object} params - PDF generation parameters
 * @param {Array} params.data - Array of data objects (required, min 1)
 * @param {string} [params.pdf_name] - Name for the PDF file (optional)
 * @param {Object} [params.headers] - Custom headers object (optional)
 * @param {string} [params.title] - PDF title (optional)
 * @param {string} [params.size] - PDF size: "xs" | "sm" | "md" | "lg" (default: "md")
 * @param {string} [params.orientation] - PDF orientation: "portrait" | "landscape" (default: "landscape")
 * @param {string} [params.margin_size] - Margin size in format "15mm", "10px", etc. (default: "15mm")
 * @param {string} [params.s3_folder] - S3 folder name (default: "pdfs")
 * @returns {Promise} Promise that resolves with PDF generation response
 */
export const generatePDF = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/pdf-generator", params);
      resolve(data.data);
    } catch (err) {
      reject(err.response?.data || err);
    }
  });
};

