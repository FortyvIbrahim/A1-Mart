import axiosInstance from "..";

const BASE_PATH = "/api-call-logs";

/**
 * @param {Object} params
 * @param {number} [params.limit=100]
 * @param {number} [params.offset=0]
 * @returns {Promise<{ code: number, data: Array }>}
 */
export const getApiCallLogs = ({ limit = 100, offset = 0 } = {}) => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .get(BASE_PATH, { params: { limit, offset } })
      .then((res) => resolve(res.data))
      .catch((err) => reject(err));
  });
};
