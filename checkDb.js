import { User } from './src/models/index.js';
import sequelize from './src/config/database.js';

(async () => {
  try {
    await sequelize.authenticate();
    const users = await User.findAll({
      attributes: ['id', 'fullName', 'joiningDate', 'contactNumber']
    });
    console.log('=== DATABASE USER RECORDS ===');
    users.forEach(u => {
      console.log(`${u.fullName} | Join Date: ${u.joiningDate} | Contact: ${u.contactNumber}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
