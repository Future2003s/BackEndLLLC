import mongoose, { Document, Schema } from "mongoose";

export interface IEmployee extends Document {
    name: string;
    salary: number;
    bankId: string;
    accountNumber: string;
    accountName: string;
    department?: string;
    position?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
    {
        name: {
            type: String,
            required: [true, "Tên nhân viên là bắt buộc"],
            trim: true,
            uppercase: true,
            maxlength: [100, "Tên nhân viên không được quá 100 ký tự"]
        },
        salary: {
            type: Number,
            required: [true, "Lương là bắt buộc"],
            min: [0, "Lương không được âm"],
            max: [1000000000, "Lương không được quá 1 tỷ VND"]
        },
        bankId: {
            type: String,
            required: [true, "Mã ngân hàng là bắt buộc"],
            trim: true,
            lowercase: true,
            enum: {
                values: [
                    "vietinbank",
                    "vietcombank",
                    "agribank",
                    "bidv",
                    "techcombank",
                    "acb",
                    "sacombank",
                    "vib",
                    "tpb",
                    "hdbank"
                ],
                message: "Mã ngân hàng không hợp lệ"
            }
        },
        accountNumber: {
            type: String,
            required: [true, "Số tài khoản là bắt buộc"],
            trim: true,
            unique: true,
            validate: {
                validator: function (v: string) {
                    return /^\d{8,20}$/.test(v);
                },
                message: "Số tài khoản phải có 8-20 chữ số"
            }
        },
        accountName: {
            type: String,
            required: [true, "Tên tài khoản là bắt buộc"],
            trim: true,
            uppercase: true,
            maxlength: [100, "Tên tài khoản không được quá 100 ký tự"]
        },
        department: {
            type: String,
            trim: true,
            maxlength: [50, "Tên phòng ban không được quá 50 ký tự"],
            default: ""
        },
        position: {
            type: String,
            trim: true,
            maxlength: [50, "Chức vụ không được quá 50 ký tự"],
            default: "Nhân viên"
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        collection: "employees",
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes for better performance
EmployeeSchema.index({ name: 1 });
EmployeeSchema.index({ accountNumber: 1 }, { unique: true });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ isActive: 1 });
EmployeeSchema.index({ createdAt: -1 });
EmployeeSchema.index({ salary: 1 });

// Compound indexes for common queries
EmployeeSchema.index({ department: 1, isActive: 1 });
EmployeeSchema.index({ name: 1, isActive: 1 });

// Virtual for formatted salary
EmployeeSchema.virtual("formattedSalary").get(function () {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(this.salary);
});

// Virtual for bank name
EmployeeSchema.virtual("bankName").get(function () {
    const bankNames: Record<string, string> = {
        vietinbank: "VietinBank",
        vietcombank: "Vietcombank",
        agribank: "Agribank",
        bidv: "BIDV",
        techcombank: "Techcombank",
        acb: "ACB",
        sacombank: "Sacombank",
        vib: "VIB",
        tpb: "TPBank",
        hdbank: "HDBank"
    };
    return bankNames[this.bankId] || this.bankId;
});

// Pre-save middleware
EmployeeSchema.pre("save", function (next) {
    // Ensure name and accountName are uppercase
    this.name = this.name.toUpperCase();
    this.accountName = this.accountName.toUpperCase();

    // If accountName is not provided, use name
    if (!this.accountName || this.accountName.trim() === "") {
        this.accountName = this.name;
    }

    next();
});

// Static method to get salary statistics
EmployeeSchema.statics.getSalaryStatistics = async function () {
    const stats = await this.aggregate([
        {
            $match: { isActive: true }
        },
        {
            $group: {
                _id: null,
                totalEmployees: { $sum: 1 },
                totalSalary: { $sum: "$salary" },
                averageSalary: { $avg: "$salary" },
                minSalary: { $min: "$salary" },
                maxSalary: { $max: "$salary" }
            }
        }
    ]);

    return (
        stats[0] || {
            totalEmployees: 0,
            totalSalary: 0,
            averageSalary: 0,
            minSalary: 0,
            maxSalary: 0
        }
    );
};

// Static method to get department statistics
EmployeeSchema.statics.getDepartmentStatistics = async function () {
    return await this.aggregate([
        {
            $match: { isActive: true }
        },
        {
            $group: {
                _id: "$department",
                count: { $sum: 1 },
                totalSalary: { $sum: "$salary" },
                averageSalary: { $avg: "$salary" }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

// Instance method to check if employee exists
EmployeeSchema.methods.checkDuplicate = async function () {
    const existingEmployee = await this.constructor.findOne({
        $or: [{ accountNumber: this.accountNumber }, { name: this.name }],
        _id: { $ne: this._id }
    });

    return existingEmployee;
};

export default mongoose.model<IEmployee>("Employee", EmployeeSchema);
