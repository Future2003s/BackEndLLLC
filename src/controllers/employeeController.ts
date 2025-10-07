import { Request, Response } from "express";
import Employee, { IEmployee } from "../models/Employee";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

/**
 * @desc    Get all employees with pagination and filtering
 * @route   GET /api/v1/employees
 * @access  Public
 */
export const getEmployees = asyncHandler(async (req: Request, res: Response) => {
    const {
        page = 1,
        limit = 50,
        search = "",
        department = "",
        sortBy = "createdAt",
        sortOrder = "desc",
        isActive = "true"
    } = req.query;

    // Build filter object
    const filter: any = {};

    if (isActive === "true" || isActive === "false") {
        filter.isActive = isActive === "true";
    }

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { accountNumber: { $regex: search, $options: "i" } },
            { accountName: { $regex: search, $options: "i" } },
            { department: { $regex: search, $options: "i" } },
            { position: { $regex: search, $options: "i" } }
        ];
    }

    if (department) {
        filter.department = department;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query with pagination
    const employees = await Employee.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean();

    // Get total count for pagination
    const total = await Employee.countDocuments(filter);

    // Get statistics
    const stats = await Employee.getSalaryStatistics();

    res.status(200).json({
        success: true,
        data: {
            employees,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            },
            statistics: stats,
            filters: {
                search,
                department,
                isActive,
                sortBy,
                sortOrder
            }
        }
    });
});

/**
 * @desc    Get single employee by ID
 * @route   GET /api/v1/employees/:id
 * @access  Public
 */
export const getEmployee = asyncHandler(async (req: Request, res: Response) => {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
        throw new AppError("Không tìm thấy nhân viên", 404);
    }

    res.status(200).json({
        success: true,
        data: employee
    });
});

/**
 * @desc    Create new employee
 * @route   POST /api/v1/employees
 * @access  Public
 */
export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
    const { name, salary, bankId, accountNumber, accountName, department, position } = req.body;

    // Check for duplicate
    const existingEmployee = await Employee.findOne({
        $or: [{ accountNumber }, { name: name.toUpperCase() }]
    });

    if (existingEmployee) {
        throw new AppError("Nhân viên đã tồn tại (trùng tên hoặc số tài khoản)", 409);
    }

    const employee = await Employee.create({
        name,
        salary,
        bankId,
        accountNumber,
        accountName,
        department: department || "",
        position: position || "Nhân viên"
    });

    logger.info(`Employee created: ${employee.name} (${employee.accountNumber})`);

    res.status(201).json({
        success: true,
        data: employee,
        message: "Tạo nhân viên thành công"
    });
});

/**
 * @desc    Update employee
 * @route   PUT /api/v1/employees/:id
 * @access  Public
 */
export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
        throw new AppError("Không tìm thấy nhân viên", 404);
    }

    // Check for duplicate if updating name or accountNumber
    if (req.body.name || req.body.accountNumber) {
        const duplicateFilter: any = { _id: { $ne: employee._id } };

        if (req.body.name) {
            duplicateFilter.name = req.body.name.toUpperCase();
        }
        if (req.body.accountNumber) {
            duplicateFilter.accountNumber = req.body.accountNumber;
        }

        const existingEmployee = await Employee.findOne(duplicateFilter);
        if (existingEmployee) {
            throw new AppError("Nhân viên đã tồn tại (trùng tên hoặc số tài khoản)", 409);
        }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    logger.info(`Employee updated: ${updatedEmployee?.name} (${updatedEmployee?.accountNumber})`);

    res.status(200).json({
        success: true,
        data: updatedEmployee,
        message: "Cập nhật nhân viên thành công"
    });
});

/**
 * @desc    Delete employee
 * @route   DELETE /api/v1/employees/:id
 * @access  Public
 */
export const deleteEmployee = asyncHandler(async (req: Request, res: Response) => {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
        throw new AppError("Không tìm thấy nhân viên", 404);
    }

    await Employee.findByIdAndDelete(req.params.id);

    logger.info(`Employee deleted: ${employee.name} (${employee.accountNumber})`);

    res.status(200).json({
        success: true,
        message: "Xóa nhân viên thành công"
    });
});

/**
 * @desc    Bulk import employees
 * @route   POST /api/v1/employees/bulk
 * @access  Public
 */
export const bulkImportEmployees = asyncHandler(async (req: Request, res: Response) => {
    const { employees, replace = false } = req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
        throw new AppError("Dữ liệu nhân viên không hợp lệ", 400);
    }

    const results = {
        total: employees.length,
        success: 0,
        failed: 0,
        errors: [] as string[],
        created: [] as IEmployee[]
    };

    // If replace is true, clear existing employees
    if (replace) {
        await Employee.deleteMany({});
        logger.info("All existing employees cleared for bulk import");
    }

    for (let i = 0; i < employees.length; i++) {
        try {
            const empData = employees[i];

            // Validate required fields
            if (!empData.name || !empData.salary || !empData.bankId || !empData.accountNumber) {
                results.failed++;
                results.errors.push(`Dòng ${i + 1}: Thiếu thông tin bắt buộc`);
                continue;
            }

            // Check for duplicates
            const existingEmployee = await Employee.findOne({
                $or: [{ accountNumber: empData.accountNumber }, { name: empData.name.toUpperCase() }]
            });

            if (existingEmployee) {
                results.failed++;
                results.errors.push(`Dòng ${i + 1}: Nhân viên đã tồn tại (${empData.name})`);
                continue;
            }

            const employee = await Employee.create({
                name: empData.name,
                salary: Number(empData.salary),
                bankId: empData.bankId,
                accountNumber: empData.accountNumber,
                accountName: empData.accountName || empData.name.toUpperCase(),
                department: empData.department || "",
                position: empData.position || "Nhân viên"
            });

            results.success++;
            results.created.push(employee);
        } catch (error) {
            results.failed++;
            results.errors.push(`Dòng ${i + 1}: ${error instanceof Error ? error.message : "Lỗi không xác định"}`);
        }
    }

    logger.info(`Bulk import completed: ${results.success} success, ${results.failed} failed`);

    res.status(200).json({
        success: results.success > 0,
        data: results,
        message: `Import hoàn thành: ${results.success} thành công, ${results.failed} thất bại`
    });
});

/**
 * @desc    Export employees to CSV
 * @route   GET /api/v1/employees/export
 * @access  Public
 */
export const exportEmployees = asyncHandler(async (req: Request, res: Response) => {
    const { format = "csv", department = "" } = req.query;

    const filter: any = { isActive: true };
    if (department) {
        filter.department = department;
    }

    const employees = await Employee.find(filter).lean();

    if (format === "csv") {
        // Generate CSV
        const headers = [
            "STT",
            "Họ và tên",
            "Lương",
            "Ngân hàng",
            "Số tài khoản",
            "Tên tài khoản",
            "Phòng ban",
            "Chức vụ",
            "Trạng thái"
        ];

        const csvRows = [
            headers.join(","),
            ...employees.map((emp, index) =>
                [
                    index + 1,
                    `"${emp.name}"`,
                    emp.salary,
                    emp.bankId,
                    emp.accountNumber,
                    `"${emp.accountName}"`,
                    `"${emp.department || ""}"`,
                    `"${emp.position || ""}"`,
                    emp.isActive ? "Hoạt động" : "Không hoạt động"
                ].join(",")
            )
        ];

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="employees_${new Date().toISOString().split("T")[0]}.csv"`
        );
        res.send(csvRows.join("\n"));
    } else {
        // Return JSON
        res.status(200).json({
            success: true,
            data: employees,
            count: employees.length
        });
    }
});

/**
 * @desc    Get employee statistics
 * @route   GET /api/v1/employees/statistics
 * @access  Public
 */
export const getEmployeeStatistics = asyncHandler(async (req: Request, res: Response) => {
    const salaryStats = await Employee.getSalaryStatistics();
    const departmentStats = await Employee.getDepartmentStatistics();

    res.status(200).json({
        success: true,
        data: {
            salary: salaryStats,
            departments: departmentStats
        }
    });
});

/**
 * @desc    Toggle employee active status
 * @route   PATCH /api/v1/employees/:id/toggle
 * @access  Public
 */
export const toggleEmployeeStatus = asyncHandler(async (req: Request, res: Response) => {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
        throw new AppError("Không tìm thấy nhân viên", 404);
    }

    employee.isActive = !employee.isActive;
    await employee.save();

    logger.info(`Employee status toggled: ${employee.name} - ${employee.isActive ? "Active" : "Inactive"}`);

    res.status(200).json({
        success: true,
        data: employee,
        message: `Nhân viên đã được ${employee.isActive ? "kích hoạt" : "vô hiệu hóa"}`
    });
});
