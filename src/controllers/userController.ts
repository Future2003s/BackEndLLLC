import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/userService";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
export const getProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await UserService.getUserProfile(req.user.id);

    ResponseHandler.success(res, user, "User profile retrieved successfully");
});

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, phone } = req.body;

    const user = await UserService.updateProfile(req.user.id, {
        firstName,
        lastName,
        phone
    });

    ResponseHandler.success(res, user, "Profile updated successfully");
});

// @desc    Get user addresses
// @route   GET /api/v1/users/addresses
// @access  Private
export const getAddresses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const addresses = await UserService.getUserAddresses(req.user.id);

    ResponseHandler.success(res, addresses, "Addresses retrieved successfully");
});

// @desc    Add user address
// @route   POST /api/v1/users/addresses
// @access  Private
export const addAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const addressData = req.body;

    const user = await UserService.addAddress(req.user.id, addressData);

    ResponseHandler.created(res, user.addresses, "Address added successfully");
});

// @desc    Update user address
// @route   PUT /api/v1/users/addresses/:addressId
// @access  Private
export const updateAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { addressId } = req.params;
    const addressData = req.body;

    const user = await UserService.updateAddress(req.user.id, addressId, addressData);

    ResponseHandler.success(res, user.addresses, "Address updated successfully");
});

// @desc    Delete user address
// @route   DELETE /api/v1/users/addresses/:addressId
// @access  Private
export const deleteAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { addressId } = req.params;

    await UserService.deleteAddress(req.user.id, addressId);

    ResponseHandler.success(res, null, "Address deleted successfully");
});

// @desc    Set default address
// @route   PUT /api/v1/users/addresses/:addressId/default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { addressId } = req.params;

    const user = await UserService.setDefaultAddress(req.user.id, addressId);

    ResponseHandler.success(res, user.addresses, "Default address updated successfully");
});

// @desc    Update user preferences
// @route   PUT /api/v1/users/preferences
// @access  Private
export const updatePreferences = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const preferences = req.body;

    const user = await UserService.updatePreferences(req.user.id, preferences);

    ResponseHandler.success(res, user.preferences, "Preferences updated successfully");
});

// @desc    Upload user avatar
// @route   POST /api/v1/users/avatar
// @access  Private
export const uploadAvatar = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // TODO: Implement file upload logic
    ResponseHandler.success(res, null, "Avatar upload - Coming soon");
});

// @desc    Delete user account
// @route   DELETE /api/v1/users/account
// @access  Private
export const deleteAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await UserService.deleteAccount(req.user.id);

    ResponseHandler.success(res, null, "Account deleted successfully");
});
