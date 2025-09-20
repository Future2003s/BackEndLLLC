import { Router } from "express";
import {
    getImportRecords,
    createImportRecord,
    getExportRecords,
    createExportRecord,
    getImportExportSummary,
    updateImportStatus,
    updateExportStatus
} from "../controllers/importExportController";
import { protect } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/v1/import-export/imports
 * @desc    Get import records
 * @access  Private
 */
router.get("/imports", getImportRecords);

/**
 * @route   POST /api/v1/import-export/imports
 * @desc    Create import record
 * @access  Private
 */
router.post("/imports", createImportRecord);

/**
 * @route   PUT /api/v1/import-export/imports/:id/status
 * @desc    Update import record status
 * @access  Private
 */
router.put("/imports/:id/status", updateImportStatus);

/**
 * @route   GET /api/v1/import-export/exports
 * @desc    Get export records
 * @access  Private
 */
router.get("/exports", getExportRecords);

/**
 * @route   POST /api/v1/import-export/exports
 * @desc    Create export record
 * @access  Private
 */
router.post("/exports", createExportRecord);

/**
 * @route   PUT /api/v1/import-export/exports/:id/status
 * @desc    Update export record status
 * @access  Private
 */
router.put("/exports/:id/status", updateExportStatus);

/**
 * @route   GET /api/v1/import-export/summary
 * @desc    Get import/export summary
 * @access  Private
 */
router.get("/summary", getImportExportSummary);

export default router;
