import axiosInstance from "..";

/**
 * GET /po - list all purchase orders (with items and stock_array joins)
 */
export const getPoList = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.get("/po");
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

/**
 * GET /po/:id - get one purchase order by id
 */
export const getPoById = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.get(`/po/${id}`);
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

/**
 * POST /po - create purchase order
 * Body: { po_id?, raised_date?, buyer_id, supplier_id, items? }
 * Each item: { product_id, qty, mrp?, net_cost?, stock_array? }
 * Each stock_array el: { branch_id, qty }
 */
export const createPo = (body) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.post("/po", body);
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

/**
 * PUT /po/:id - update purchase order
 */
export const updatePo = (id, body) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.put(`/po/${id}`, body);
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

/**
 * DELETE /po/:id
 */
export const deletePo = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.delete(`/po/${id}`);
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};
