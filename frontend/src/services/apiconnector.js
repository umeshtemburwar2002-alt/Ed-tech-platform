import axios from "axios";
import { getStoredAccessToken } from "../utils/supabaseAuthHelpers";

const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:4000/api/v1";

console.log("[apiConnector] Initializing with BASE_URL:", BASE_URL);

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
      console.log("[apiConnector] ✅ Authorization header added for:", config.url);
    } else {
      console.warn("[apiConnector] ⚠️ No token available for:", config.url);
    }
    return config;
  },
  (error) => {
    console.error("[apiConnector] Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log("[apiConnector] ✅ Response received:", {
      url: response.config.url,
      status: response.status,
      hasData: !!response.data
    });
    return response;
  },
  (error) => {
    if (error.response) {
      console.error("[apiConnector] ❌ Response error:", {
        url: error.config?.url,
        status: error.response.status,
        message: error.response.data?.message || error.message
      });
    } else if (error.request) {
      console.error("[apiConnector] ❌ No response received:", {
        url: error.config?.url,
        message: error.message
      });
    } else {
      console.error("[apiConnector] ❌ Request setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

export const apiConnector = async (method, url, bodyData, headers, params) => {
  try {
    console.log("[apiConnector] Making request:", {
      method,
      url,
      hasBody: !!bodyData,
      hasParams: !!params
    });

    // If url is relative, it will use BASE_URL, otherwise it will use absolute url
    const response = await axiosInstance({
      method: method,
      url: url,
      data: bodyData ? bodyData : undefined,
      headers: headers ? headers : undefined,
      params: params ? params : undefined,
    });

    console.log("[apiConnector] ✅ Request successful:", {
      url,
      status: response.status
    });

    return response;
  } catch (error) {
    // If the request fails, return the error response so callers can handle it
    console.error("[apiConnector] ❌ Request failed:", {
      url,
      error: error.message,
      status: error.response?.status
    });
    return error.response || { data: { success: false, message: error.message } };
  }
};