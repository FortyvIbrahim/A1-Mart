import axiosInstance from "..";

/** Path segment for product sync row (matches backend `sync_config.sync_key`). */
export const SYNC_KEY_PRODUCT = "product_sync";

const path = (syncKey) => `/sync-config/${encodeURIComponent(syncKey)}`;

/**
 * @param {string} syncKey
 * @returns {Promise<{ code: number, data?: { sync_key: string, cron: string, is_active: boolean | number }, msg?: string }>}
 */
export const getSyncConfig = (syncKey) => {
  return axiosInstance.get(path(syncKey)).then((res) => res.data);
};

/**
 * @param {string} syncKey
 * @param {{ cron?: string, is_active?: boolean | 0 | 1 }} body
 * @returns {Promise<{ code: number, data?: object, msg?: string }>}
 */
export const patchSyncConfig = (syncKey, body) => {
  return axiosInstance.put(path(syncKey), body).then((res) => res.data);
};
