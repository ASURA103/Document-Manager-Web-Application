import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/documents",
});

// Automatically attach JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ==============================
// GET ALL DOCUMENTS
// ==============================

export const getDocuments = () => API.get("/");

// ==============================
// GET SINGLE DOCUMENT
// ==============================

export const getDocumentById = (id) => API.get(`/${id}`);

// ==============================
// CREATE DOCUMENT
// ==============================

export const createDocument = (data) => API.post("/", data);

// ==============================
// UPDATE DOCUMENT
// ==============================

export const updateDocument = (id, data) =>
  API.put(`/${id}`, data);

// ==============================
// DELETE DOCUMENT
// ==============================

export const deleteDocument = (id) =>
  API.delete(`/${id}`);

// ==============================
// SHARE DOCUMENT
// ==============================

export const shareDocument = (id, email) =>
  API.post(`/${id}/share`, {
    email,
  });