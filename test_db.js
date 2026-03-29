const { AppDataSource } = require('./src/config/data-source');

AppDataSource.initialize()
    .then(() => {
        console.log("SUCCESS: Database connected!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("FAILURE: Database connection failed!");
        console.error(err);
        process.exit(1);
    });
