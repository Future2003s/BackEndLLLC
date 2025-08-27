"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.uploadAvatar = exports.updatePreferences = exports.setDefaultAddress = exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.getAddresses = exports.updateProfile = exports.getProfile = void 0;
const userService_1 = require("../services/userService");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
exports.getProfile = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const user = await userService_1.UserService.getUserProfile(req.user.id);
    response_1.ResponseHandler.success(res, user, "User profile retrieved successfully");
});
// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
exports.updateProfile = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { firstName, lastName, phone } = req.body;
    const user = await userService_1.UserService.updateProfile(req.user.id, {
        firstName,
        lastName,
        phone
    });
    response_1.ResponseHandler.success(res, user, "Profile updated successfully");
});
// @desc    Get user addresses
// @route   GET /api/v1/users/addresses
// @access  Private
exports.getAddresses = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const addresses = await userService_1.UserService.getUserAddresses(req.user.id);
    response_1.ResponseHandler.success(res, addresses, "Addresses retrieved successfully");
});
// @desc    Add user address
// @route   POST /api/v1/users/addresses
// @access  Private
exports.addAddress = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const addressData = req.body;
    const user = await userService_1.UserService.addAddress(req.user.id, addressData);
    response_1.ResponseHandler.created(res, user.addresses, "Address added successfully");
});
// @desc    Update user address
// @route   PUT /api/v1/users/addresses/:addressId
// @access  Private
exports.updateAddress = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { addressId } = req.params;
    const addressData = req.body;
    const user = await userService_1.UserService.updateAddress(req.user.id, addressId, addressData);
    response_1.ResponseHandler.success(res, user.addresses, "Address updated successfully");
});
// @desc    Delete user address
// @route   DELETE /api/v1/users/addresses/:addressId
// @access  Private
exports.deleteAddress = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { addressId } = req.params;
    await userService_1.UserService.deleteAddress(req.user.id, addressId);
    response_1.ResponseHandler.success(res, null, "Address deleted successfully");
});
// @desc    Set default address
// @route   PUT /api/v1/users/addresses/:addressId/default
// @access  Private
exports.setDefaultAddress = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { addressId } = req.params;
    const user = await userService_1.UserService.setDefaultAddress(req.user.id, addressId);
    response_1.ResponseHandler.success(res, user.addresses, "Default address updated successfully");
});
// @desc    Update user preferences
// @route   PUT /api/v1/users/preferences
// @access  Private
exports.updatePreferences = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const preferences = req.body;
    const user = await userService_1.UserService.updatePreferences(req.user.id, preferences);
    response_1.ResponseHandler.success(res, user.preferences, "Preferences updated successfully");
});
// @desc    Upload user avatar
// @route   POST /api/v1/users/avatar
// @access  Private
exports.uploadAvatar = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    // TODO: Implement file upload logic
    response_1.ResponseHandler.success(res, null, "Avatar upload - Coming soon");
});
// @desc    Delete user account
// @route   DELETE /api/v1/users/account
// @access  Private
exports.deleteAccount = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    await userService_1.UserService.deleteAccount(req.user.id);
    response_1.ResponseHandler.success(res, null, "Account deleted successfully");
});
