import axios from "axios";

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8001",
  timeout: 60000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({ message: "We couldn't connect to the analysis service. Please check that the backend is running and try again." });
    }
    const status = error.response.status;
    const messages: Record<number, string> = {
      400: "The uploaded image could not be processed. Please try a different file.",
      404: "The requested analysis could not be found.",
      413: "File size exceeds the maximum limit.",
      422: "The uploaded file is not a valid image.",
      500: "The analysis service encountered an error. Please try again.",
    };
    return Promise.reject({
      message: messages[status] || "Something went wrong while processing your request.",
      status,
    });
  }
);
