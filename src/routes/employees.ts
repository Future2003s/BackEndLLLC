import { Router } from "express";
import {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    bulkImportEmployees,
    exportEmployees,
    getEmployeeStatistics,
    toggleEmployeeStatus
} from "../controllers/employeeController";

const router = Router();

/**
 * @swagger
 * /api/v1/employees:
 *   get:
 *     summary: Get all employees with pagination and filtering
 *     tags: [Employees]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of employees per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, account number, department
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: true
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of employees with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     employees:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Employee'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         totalEmployees:
 *                           type: integer
 *                         totalSalary:
 *                           type: number
 *                         averageSalary:
 *                           type: number
 *                         minSalary:
 *                           type: number
 *                         maxSalary:
 *                           type: number
 */
router.get("/", getEmployees);

/**
 * @swagger
 * /api/v1/employees/statistics:
 *   get:
 *     summary: Get employee statistics
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Employee statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     salary:
 *                       type: object
 *                       properties:
 *                         totalEmployees:
 *                           type: integer
 *                         totalSalary:
 *                           type: number
 *                         averageSalary:
 *                           type: number
 *                         minSalary:
 *                           type: number
 *                         maxSalary:
 *                           type: number
 *                     departments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           totalSalary:
 *                             type: number
 *                           averageSalary:
 *                             type: number
 */
router.get("/statistics", getEmployeeStatistics);

/**
 * @swagger
 * /api/v1/employees/export:
 *   get:
 *     summary: Export employees to CSV or JSON
 *     tags: [Employees]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *     responses:
 *       200:
 *         description: Exported data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 count:
 *                   type: integer
 */
router.get("/export", exportEmployees);

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   get:
 *     summary: Get single employee by ID
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 */
router.get("/:id", getEmployee);

/**
 * @swagger
 * /api/v1/employees:
 *   post:
 *     summary: Create new employee
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - salary
 *               - bankId
 *               - accountNumber
 *             properties:
 *               name:
 *                 type: string
 *                 description: Employee name
 *               salary:
 *                 type: number
 *                 description: Employee salary
 *               bankId:
 *                 type: string
 *                 enum: [vietinbank, vietcombank, agribank, bidv, techcombank, acb, sacombank, vib, tpb, hdbank]
 *                 description: Bank ID
 *               accountNumber:
 *                 type: string
 *                 description: Bank account number
 *               accountName:
 *                 type: string
 *                 description: Bank account name
 *               department:
 *                 type: string
 *                 description: Department
 *               position:
 *                 type: string
 *                 description: Position
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Employee already exists
 */
router.post("/", createEmployee);

/**
 * @swagger
 * /api/v1/employees/bulk:
 *   post:
 *     summary: Bulk import employees
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employees:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - salary
 *                     - bankId
 *                     - accountNumber
 *                   properties:
 *                     name:
 *                       type: string
 *                     salary:
 *                       type: number
 *                     bankId:
 *                       type: string
 *                     accountNumber:
 *                       type: string
 *                     accountName:
 *                       type: string
 *                     department:
 *                       type: string
 *                     position:
 *                       type: string
 *               replace:
 *                 type: boolean
 *                 default: false
 *                 description: Replace all existing employees
 *     responses:
 *       200:
 *         description: Bulk import completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     success:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                     created:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Employee'
 *                 message:
 *                   type: string
 */
router.post("/bulk", bulkImportEmployees);

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   put:
 *     summary: Update employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               salary:
 *                 type: number
 *               bankId:
 *                 type: string
 *               accountNumber:
 *                 type: string
 *               accountName:
 *                 type: string
 *               department:
 *                 type: string
 *               position:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *                 message:
 *                   type: string
 *       404:
 *         description: Employee not found
 *       409:
 *         description: Duplicate employee
 */
router.put("/:id", updateEmployee);

/**
 * @swagger
 * /api/v1/employees/{id}/toggle:
 *   patch:
 *     summary: Toggle employee active status
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee status toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *                 message:
 *                   type: string
 *       404:
 *         description: Employee not found
 */
router.patch("/:id/toggle", toggleEmployeeStatus);

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   delete:
 *     summary: Delete employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Employee not found
 */
router.delete("/:id", deleteEmployee);

export default router;
