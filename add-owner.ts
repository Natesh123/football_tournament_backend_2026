import { AppDataSource } from './src/config/data-source';

async function run() {
  await AppDataSource.initialize();
  
  try {
      await AppDataSource.query(`ALTER TABLE tournaments ADD COLUMN ownerId int NULL`);
      console.log("Added ownerId column to tournaments successfully.");
  } catch (err: any) {
      if (err.code === 'ER_DUP_FIELDNAME') {
          console.log("ownerId already exists");
      } else {
          console.error("Error adding ownerId:", err.message);
      }
  }

  process.exit(0);
}

run();
