import { Op } from 'sequelize';
import { Holiday, HolidayRule, AuditLog } from '../models/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export const getAllHolidays = async () => {
  return await Holiday.findAll({
    include: [{ model: HolidayRule, as: 'rule' }],
    order: [['holidayDate', 'ASC']],
  });
};

export const getUpcomingHolidays = async (limit = 4) => {
  const today = new Date().toISOString().split('T')[0];
  
  return await Holiday.findAll({
    where: {
      holidayDate: {
        [Op.gte]: today,
      },
    },
    include: [{ model: HolidayRule, as: 'rule' }],
    order: [['holidayDate', 'ASC']],
    limit,
  });
};

export const createHolidayRule = async (data, adminId, ipAddress) => {
  const { name, type, fixedMonth, fixedDay, seededDate2026 } = data;

  const existing = await HolidayRule.findOne({ where: { name } });
  if (existing) {
    throw new BadRequestError(`A holiday rule named "${name}" already exists.`);
  }

  const rule = await HolidayRule.create({
    name,
    type,
    fixedMonth,
    fixedDay,
    seededDate2026,
  });

  // Calculate holiday date for 2026
  let holidayDate = null;
  if (type === 'fixed') {
    holidayDate = `2026-${String(fixedMonth).padStart(2, '0')}-${String(fixedDay).padStart(2, '0')}`;
  } else {
    holidayDate = seededDate2026;
  }

  if (holidayDate) {
    await Holiday.create({
      ruleId: rule.id,
      holidayDate,
      name,
    });
  }

  await AuditLog.create({
    userId: adminId,
    action: 'HOLIDAY_RULE_CREATED',
    details: `Created holiday rule "${name}"`,
    ipAddress,
  });

  return rule;
};
