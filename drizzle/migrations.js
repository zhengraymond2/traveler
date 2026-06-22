// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_cold_red_skull.sql';
import m0001 from './0001_flawless_bloodstorm.sql';
import m0002 from './0002_medical_blue_shield.sql';
import m0003 from './0003_location_recognition_cache.sql';
import m0004 from './0004_bizarre_silver_fox.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
  },
};
