import axiosInstance from "..";

/**
 * GET /purchase-reorders - list all with joined product, buyer, supplier
 */
export const getPurchaseReorders = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.get("/purchase-reorders");
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

/**
 * POST /purchase-reorders/bulk - bulk upsert
 * Body: array of { product_id, qty, mrp?, cost_price?, discount?, order_worth?, tax_amount?, buyer_id, supplier_id }
 */
export const bulkInsertPurchaseReorders = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.post("/purchase-reorders/bulk", payload);
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};
