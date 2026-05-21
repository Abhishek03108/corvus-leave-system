import * as analyticsService from '../services/analyticsService.js';

export const getMonthlyLeaveAnalytics = async (req, res, next) => {
  try {
    const { month, year, department, leaveTypeId, status } = req.query;
    const filters = { department, leaveTypeId, status };
    const currentUser = req.user;

    const result = await analyticsService.getMonthlyLeaveAnalytics(month, year, filters, currentUser);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const result = await analyticsService.getDashboardStats(currentUser);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
