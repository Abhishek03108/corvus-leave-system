import * as holidayService from '../services/holidayService.js';

export const getAllHolidays = async (req, res, next) => {
  try {
    const result = await holidayService.getAllHolidays();
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingHolidays = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const result = await holidayService.getUpcomingHolidays(limit);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createHolidayRule = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const ipAddress = req.ip;
    const result = await holidayService.createHolidayRule(req.body, adminId, ipAddress);
    return res.status(211).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
