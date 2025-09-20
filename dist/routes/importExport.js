"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const importExportController_1 = require("../controllers/importExportController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.protect);
/**
 * @route   GET /api/v1/import-export/imports
 * @desc    Get import records
 * @access  Private
 */
router.get("/imports", importExportController_1.getImportRecords);
/**
 * @route   POST /api/v1/import-export/imports
 * @desc    Create import record
 * @access  Private
 */
router.post("/imports", importExportController_1.createImportRecord);
/**
 * @route   PUT /api/v1/import-export/imports/:id/status
 * @desc    Update import record status
 * @access  Private
 */
router.put("/imports/:id/status", importExportController_1.updateImportStatus);
/**
 * @route   GET /api/v1/import-export/exports
 * @desc    Get export records
 * @access  Private
 */
router.get("/exports", importExportController_1.getExportRecords);
/**
 * @route   POST /api/v1/import-export/exports
 * @desc    Create export record
 * @access  Private
 */
router.post("/exports", importExportController_1.createExportRecord);
/**
 * @route   PUT /api/v1/import-export/exports/:id/status
 * @desc    Update export record status
 * @access  Private
 */
router.put("/exports/:id/status", importExportController_1.updateExportStatus);
/**
 * @route   GET /api/v1/import-export/summary
 * @desc    Get import/export summary
 * @access  Private
 */
router.get("/summary", importExportController_1.getImportExportSummary);
exports.default = router;
