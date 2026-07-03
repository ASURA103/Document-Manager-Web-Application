import api from "./api";

export const loginUser = (data) => api.post("/auth/login", data);

export const signupUser = (data) => api.post("/auth/signup", data);

export const getMe = () => api.get("/auth/me");