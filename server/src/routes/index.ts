import { Router } from "express";
import admin from "./admin";
import auth from "./auth";
import business from "./business";
import contacts from "./contacts";
import inventory from "./inventory";
import reports from "./reports";
import transactions from "./transactions";

const router = Router();
router.use("/auth", auth);
router.use("/business", business);
router.use("/admin", admin);
router.use("/products", inventory);
router.use("/", contacts);
router.use("/", transactions);
router.use("/reports", reports);

export default router;
