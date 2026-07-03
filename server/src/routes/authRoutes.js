import express from "express";
import { body } from "express-validator";

import protect from "../middleware/authMiddleware.js";

import {
  signupUser,
  loginUser,
  getCurrentUser,
} from "../controller/authController.js";

const router = express.Router();

/*
=====================================
Signup
=====================================
*/

router.post(
  "/signup",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required."),

    body("email")
      .trim()
      .isEmail()
      .withMessage("Please enter a valid email."),

    body("password")
      .trim()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters."),
  ],
  signupUser
);

/*
=====================================
Login
=====================================
*/

router.post(
  "/login",
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please enter a valid email."),

    body("password")
      .trim()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters."),
  ],
  loginUser
);

/*
=====================================
Current User
=====================================
*/

router.get("/me", protect, getCurrentUser);

export default router;