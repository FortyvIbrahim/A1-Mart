import toast from "react-hot-toast";
import { generatePDF } from "@/api/helpers/pdf";

/**
 * Generate PDF with toast notifications
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
export const generatePDFWithToast = (params) => {
  return toast.promise(generatePDF(params), {
    loading: "PDF Generating",
    success: (response) => {
      // Handle both response structures: { code: 200, data: {...} } or direct response
      const pdfData = response.code === 200 ? response.data : response;

      if (response.code === 200 || pdfData?.pdf_url) {
        const recordCount = pdfData?.record_count || 0;
        return `PDF generated successfully! ${recordCount} record${
          recordCount !== 1 ? "s" : ""
        } processed.`;
      }
      throw new Error(
        response.msg || response.message || "Failed to generate PDF"
      );
    },
    error: (err) => {
      console.error("PDF generation error:", err);
      return err.msg || err.message || "Error generating PDF";
    },
  });
};
