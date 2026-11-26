import axiosInstance from "..";

export const getProductDepartments = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/product/departments");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getProductCategories = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/product/categories");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getProductSubcategories = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/product/subcategories");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getProductBrands = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/product/brands");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

function buildProductListQuery(withStockPrice, ignoreBranchCheck) {
  const params = new URLSearchParams();
  if (withStockPrice) params.set("include_stock_price", "true");
  if (ignoreBranchCheck) params.set("ignore_branch_check", "true");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * @param {boolean} [withStockPrice=false]
 * @param {boolean} [ignoreBranchCheck=false]
 */
export const getAllProducts = (
  withStockPrice = false,
  ignoreBranchCheck = false
) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(
        `/product/all${buildProductListQuery(withStockPrice, ignoreBranchCheck)}`
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * @param {string|number} id
 * @param {boolean} [withStockPrice=false]
 * @param {boolean} [ignoreBranchCheck=false]
 */
export const getProductById = (
  id,
  withStockPrice = false,
  ignoreBranchCheck = false
) => {
  return new Promise(async function (resolve, reject) {
    try {
      const params = new URLSearchParams();
      params.set("product_id", String(id));
      if (withStockPrice) params.set("include_stock_price", "true");
      if (ignoreBranchCheck) params.set("ignore_branch_check", "true");
      const data = await axiosInstance.get(
        `/product/product_id?${params.toString()}`
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateProduct = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(`/product/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Bulk update product image URLs.
 * @param {Array<{ product_id: number, image_url: string | null }>} items
 * @returns {Promise}
 */
export const bulkUpdateProductImageUrls = (items) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put("/product/bulk-image-url", {
        items,
      });
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const syncProducts = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/product/sync");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
