import * as userService from '../services/userService.js';

export const getUserProfile = async (req, res, next) => {
  try {
    const result = await userService.getUserProfile(req.user.id);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const ipAddress = req.ip;
    const result = await userService.updateProfile(userId, req.body, ipAddress);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeList = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const result = await userService.getEmployeeList(currentUser);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
