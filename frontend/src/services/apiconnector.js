import axios from "axios";
import { getStoredAccessToken } from "../utils/supabaseAuthHelpers";

const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:4000/api/v1";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Axios Request Interceptor to automatically inject the Bearer token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const apiConnector = async (method, url, bodyData, headers, params) => {
  try {
    // If url is relative, it will use BASE_URL, otherwise it will use absolute url
    const response = await axiosInstance({
      method: method,
      url: url,
      data: bodyData ? bodyData : null,
      headers: headers ? headers : null,
      params: params ? params : null,
    });
    return response;
  } catch (error) {
    // If the request fails, return the error response so callers can handle it
    console.error("[apiConnector] Error:", error);
    return error.response || { data: { success: false, message: error.message } };
  }
};