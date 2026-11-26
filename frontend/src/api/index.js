import constants from "./constants";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: constants.BASE_URL,
  validateStatus: function (status) {
    return status >= 200 && status < 429;
  },
  transformResponse: [
    (res) => {
      try {
        if (res === null) {
          throw Error("Res is Null");
        }
        if (res === "") return res;
        res = JSON.parse(res);

        if (typeof window !== "undefined") {
          if (
            res.code === 403 &&
            window.location.pathname !== "/login" &&
            window.location.pathname !== "/register"
          ) {
            localStorage.removeItem("token");
            localStorage.removeItem("userType");
            window.location.href = "/login";
          }
        }

        return res;
      } catch (err) {
        console.log(err);
        throw Error(res);
      }
    },
  ],
});

axiosInstance.updateToken = (token) => {
  axiosInstance.defaults.headers.common["x-access-token"] = token;
  // localStorage.setItem("accessToken", token);
};

/* ── In-flight request tracking (drives table skeletons) ───────────── */
let pendingRequests = 0;
const pendingListeners = new Set();
const notifyPending = () => pendingListeners.forEach((fn) => fn());

export const subscribePendingRequests = (fn) => {
  pendingListeners.add(fn);
  return () => pendingListeners.delete(fn);
};
export const getPendingRequests = () => pendingRequests;

axiosInstance.interceptors.request.use(
  (config) => {
    pendingRequests += 1;
    notifyPending();
    return config;
  },
  (error) => Promise.reject(error)
);
axiosInstance.interceptors.response.use(
  (response) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    notifyPending();
    return response;
  },
  (error) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    notifyPending();
    return Promise.reject(error);
  }
);

export default axiosInstance;
