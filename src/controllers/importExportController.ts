import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { cacheService } from "../services/cacheService";

/**
 * Import/Export Management Controller for QuanLyHangTon
 * Handles inventory import and export operations
 */

// Mock data for import/export records (in real app, you'd have separate collections)
let importRecords: any[] = [];
let exportRecords: any[] = [];

/**
 * Get import records
 */
export const getImportRecords = asyncHandler(async (req: Request, res: Response) => {
    const {
        page = 1,
        limit = 20,
        search,
        status,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc"
    } = req.query;

    // Build filter
    let filteredRecords = [...importRecords];

    if (search) {
        filteredRecords = filteredRecords.filter(
            (record) =>
                record.importCode.toLowerCase().includes((search as string).toLowerCase()) ||
                record.supplier.toLowerCase().includes((search as string).toLowerCase())
        );
    }

    if (status) {
        filteredRecords = filteredRecords.filter((record) => record.status === status);
    }

    if (startDate) {
        filteredRecords = filteredRecords.filter(
            (record) => new Date(record.importDate) >= new Date(startDate as string)
        );
    }

    if (endDate) {
        filteredRecords = filteredRecords.filter(
            (record) => new Date(record.importDate) <= new Date(endDate as string)
        );
    }

    // Sort
    filteredRecords.sort((a, b) => {
        const aValue = a[sortBy as string];
        const bValue = b[sortBy as string];

        if (sortOrder === "desc") {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        } else {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
    });

    // Paginate
    const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    res.status(200).json(
        new ApiResponse(true, "Import records retrieved successfully", {
            records: paginatedRecords,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total: filteredRecords.length,
                pages: Math.ceil(filteredRecords.length / parseInt(limit as string))
            }
        })
    );
});

/**
 * Create import record
 */
export const createImportRecord = asyncHandler(async (req: Request, res: Response) => {
    const { supplier, items, notes, importDate } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json(new ApiResponse(true, "Items are required", null));
    }

    // Calculate totals
    let totalItems = 0;
    let totalValue = 0;

    for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
            return res.status(400).json(new ApiResponse(false, `Product ${item.productId} not found`));
        }

        totalItems += item.quantity;
        totalValue += item.quantity * item.unitPrice;

        // Update product stock
        product.quantity += item.quantity;
        product.updatedAt = new Date();
        await product.save();
    }

    // Create import record
    const importRecord = {
        id: `IMP-${Date.now()}`,
        importCode: `IMP-${Date.now()}`,
        supplier,
        totalItems,
        totalValue,
        items,
        importDate: importDate || new Date().toISOString().split("T")[0],
        status: "completed",
        createdBy: req.user?.firstName + " " + req.user?.lastName,
        createdAt: new Date(),
        notes
    };

    importRecords.push(importRecord);

    // Clear cache
    await cacheService.delete("inventory", "inventory_overview");

    res.status(201).json(new ApiResponse(true, "Import record created successfully", importRecord));
});

/**
 * Get export records
 */
export const getExportRecords = asyncHandler(async (req: Request, res: Response) => {
    const {
        page = 1,
        limit = 20,
        search,
        status,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc"
    } = req.query;

    // Build filter
    let filteredRecords = [...exportRecords];

    if (search) {
        filteredRecords = filteredRecords.filter(
            (record) =>
                record.exportCode.toLowerCase().includes((search as string).toLowerCase()) ||
                record.customer.toLowerCase().includes((search as string).toLowerCase())
        );
    }

    if (status) {
        filteredRecords = filteredRecords.filter((record) => record.status === status);
    }

    if (startDate) {
        filteredRecords = filteredRecords.filter(
            (record) => new Date(record.exportDate) >= new Date(startDate as string)
        );
    }

    if (endDate) {
        filteredRecords = filteredRecords.filter(
            (record) => new Date(record.exportDate) <= new Date(endDate as string)
        );
    }

    // Sort
    filteredRecords.sort((a, b) => {
        const aValue = a[sortBy as string];
        const bValue = b[sortBy as string];

        if (sortOrder === "desc") {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        } else {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
    });

    // Paginate
    const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    res.status(200).json(
        new ApiResponse(true, "Export records retrieved successfully", {
            records: paginatedRecords,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total: filteredRecords.length,
                pages: Math.ceil(filteredRecords.length / parseInt(limit as string))
            }
        })
    );
});

/**
 * Create export record
 */
export const createExportRecord = asyncHandler(async (req: Request, res: Response) => {
    const { customer, items, notes, exportDate } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json(new ApiResponse(true, "Items are required", null));
    }

    // Calculate totals and validate stock
    let totalItems = 0;
    let totalValue = 0;

    for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
            return res.status(400).json(new ApiResponse(false, `Product ${item.productId} not found`));
        }

        if (product.quantity < item.quantity) {
            return res
                .status(400)
                .json(
                    new ApiResponse(
                        false,
                        `Insufficient stock for product ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
                    )
                );
        }

        totalItems += item.quantity;
        totalValue += item.quantity * item.unitPrice;

        // Update product stock
        product.quantity -= item.quantity;
        product.updatedAt = new Date();
        await product.save();
    }

    // Create export record
    const exportRecord = {
        id: `EXP-${Date.now()}`,
        exportCode: `EXP-${Date.now()}`,
        customer,
        totalItems,
        totalValue,
        items,
        exportDate: exportDate || new Date().toISOString().split("T")[0],
        status: "completed",
        createdBy: req.user?.firstName + " " + req.user?.lastName,
        createdAt: new Date(),
        notes
    };

    exportRecords.push(exportRecord);

    // Clear cache
    await cacheService.delete("inventory", "inventory_overview");

    res.status(201).json(new ApiResponse(true, "Export record created successfully", exportRecord));
});

/**
 * Get import/export summary
 */
export const getImportExportSummary = asyncHandler(async (req: Request, res: Response) => {
    const { period = "30d" } = req.query;

    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Filter records by period
    const recentImports = importRecords.filter((record) => new Date(record.createdAt) >= startDate);

    const recentExports = exportRecords.filter((record) => new Date(record.createdAt) >= startDate);

    // Calculate summary
    const totalImports = recentImports.length;
    const totalExports = recentExports.length;
    const totalImportValue = recentImports.reduce((sum, record) => sum + record.totalValue, 0);
    const totalExportValue = recentExports.reduce((sum, record) => sum + record.totalValue, 0);
    const totalImportItems = recentImports.reduce((sum, record) => sum + record.totalItems, 0);
    const totalExportItems = recentExports.reduce((sum, record) => sum + record.totalItems, 0);

    // Status distribution
    const importStatusDistribution = recentImports.reduce((acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1;
        return acc;
    }, {});

    const exportStatusDistribution = recentExports.reduce((acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1;
        return acc;
    }, {});

    // Daily trends (simplified)
    const dailyTrends = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayImports = recentImports.filter((record) => record.importDate === dateStr);

        const dayExports = recentExports.filter((record) => record.exportDate === dateStr);

        dailyTrends.push({
            date: dateStr,
            imports: dayImports.length,
            exports: dayExports.length,
            importValue: dayImports.reduce((sum, record) => sum + record.totalValue, 0),
            exportValue: dayExports.reduce((sum, record) => sum + record.totalValue, 0)
        });
    }

    const summary = {
        period,
        overview: {
            totalImports,
            totalExports,
            totalImportValue,
            totalExportValue,
            totalImportItems,
            totalExportItems,
            netValue: totalImportValue - totalExportValue
        },
        statusDistribution: {
            imports: importStatusDistribution,
            exports: exportStatusDistribution
        },
        dailyTrends,
        generatedAt: new Date()
    };

    res.status(200).json(new ApiResponse(true, "Import/Export summary retrieved successfully", summary));
});

/**
 * Update import record status
 */
export const updateImportStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const record = importRecords.find((r) => r.id === id);
    if (!record) {
        return res.status(404).json(new ApiResponse(true, "Import record not found", null));
    }

    record.status = status;
    record.updatedAt = new Date();

    res.status(200).json(new ApiResponse(true, "Import record status updated successfully", record));
});

/**
 * Update export record status
 */
export const updateExportStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const record = exportRecords.find((r) => r.id === id);
    if (!record) {
        return res.status(404).json(new ApiResponse(true, "Export record not found", null));
    }

    record.status = status;
    record.updatedAt = new Date();

    res.status(200).json(new ApiResponse(true, "Export record status updated successfully", record));
});
