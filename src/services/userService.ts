import { User, IUser } from "../models/User";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

interface UpdateProfileData {
    firstName?: string;
    lastName?: string;
    phone?: string;
}

interface AddressData {
    type: "home" | "work" | "other";
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault?: boolean;
}

interface PreferencesData {
    language?: string;
    currency?: string;
    notifications?: {
        email?: boolean;
        sms?: boolean;
        push?: boolean;
    };
}

export class UserService {
    /**
     * Get user profile by ID
     */
    static async getUserProfile(userId: string): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            return user;
        } catch (error) {
            logger.error("Get user profile error:", error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    static async updateProfile(userId: string, updateData: UpdateProfileData): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            // Update fields
            if (updateData.firstName) user.firstName = updateData.firstName;
            if (updateData.lastName) user.lastName = updateData.lastName;
            if (updateData.phone) user.phone = updateData.phone;

            await user.save();

            logger.info(`Profile updated for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Update profile error:", error);
            throw error;
        }
    }

    /**
     * Get user addresses
     */
    static async getUserAddresses(userId: string): Promise<any[]> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            return user.addresses;
        } catch (error) {
            logger.error("Get user addresses error:", error);
            throw error;
        }
    }

    /**
     * Add new address
     */
    static async addAddress(userId: string, addressData: AddressData): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            // If this is set as default, unset other defaults
            if (addressData.isDefault) {
                user.addresses.forEach((addr) => {
                    addr.isDefault = false;
                });
            }

            // Add new address
            user.addresses.push(addressData as any);
            await user.save();

            logger.info(`Address added for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Add address error:", error);
            throw error;
        }
    }

    /**
     * Update address
     */
    static async updateAddress(userId: string, addressId: string, addressData: Partial<AddressData>): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
            if (addressIndex === -1) {
                throw new AppError("Address not found", 404);
            }

            // If setting as default, unset other defaults
            if (addressData.isDefault) {
                user.addresses.forEach((addr) => {
                    addr.isDefault = false;
                });
            }

            // Update address fields
            Object.assign(user.addresses[addressIndex], addressData);
            await user.save();

            logger.info(`Address updated for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Update address error:", error);
            throw error;
        }
    }

    /**
     * Delete address
     */
    static async deleteAddress(userId: string, addressId: string): Promise<void> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
            if (addressIndex === -1) {
                throw new AppError("Address not found", 404);
            }

            user.addresses.splice(addressIndex, 1);
            await user.save();

            logger.info(`Address deleted for user: ${user.email}`);
        } catch (error) {
            logger.error("Delete address error:", error);
            throw error;
        }
    }

    /**
     * Set default address
     */
    static async setDefaultAddress(userId: string, addressId: string): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
            if (addressIndex === -1) {
                throw new AppError("Address not found", 404);
            }

            // Unset all defaults
            user.addresses.forEach((addr) => {
                addr.isDefault = false;
            });

            // Set new default
            user.addresses[addressIndex].isDefault = true;
            await user.save();

            logger.info(`Default address set for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Set default address error:", error);
            throw error;
        }
    }

    /**
     * Update user preferences
     */
    static async updatePreferences(userId: string, preferencesData: PreferencesData): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            // Update preferences
            if (preferencesData.language) {
                user.preferences.language = preferencesData.language;
            }
            if (preferencesData.currency) {
                user.preferences.currency = preferencesData.currency;
            }
            if (preferencesData.notifications) {
                Object.assign(user.preferences.notifications, preferencesData.notifications);
            }

            await user.save();

            logger.info(`Preferences updated for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Update preferences error:", error);
            throw error;
        }
    }

    /**
     * Delete user account (soft delete)
     */
    static async deleteAccount(userId: string): Promise<void> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            // Soft delete - deactivate account
            user.isActive = false;
            await user.save();

            logger.info(`Account deleted for user: ${user.email}`);
        } catch (error) {
            logger.error("Delete account error:", error);
            throw error;
        }
    }

    /**
     * Get user statistics (for admin)
     */
    static async getUserStats(): Promise<any> {
        try {
            const totalUsers = await User.countDocuments();
            const activeUsers = await User.countDocuments({ isActive: true });
            const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
            const recentUsers = await User.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            });

            return {
                totalUsers,
                activeUsers,
                verifiedUsers,
                recentUsers,
                inactiveUsers: totalUsers - activeUsers,
                unverifiedUsers: totalUsers - verifiedUsers
            };
        } catch (error) {
            logger.error("Get user stats error:", error);
            throw error;
        }
    }
}
