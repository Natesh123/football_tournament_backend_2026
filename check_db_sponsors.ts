
import { AppDataSource } from "./src/config/data-source";
import { Sponsor } from "./src/entities/sponsor.entity";

async function checkSponsors() {
    try {
        await AppDataSource.initialize();
        const sponsorRepo = AppDataSource.getRepository(Sponsor);
        const count = await sponsorRepo.count();
        const allSponsors = await sponsorRepo.find();
        
        console.log(`Total sponsors in DB: ${count}`);
        if (count > 0) {
            console.log('Sponsor list:', JSON.stringify(allSponsors, null, 2));
        }
        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error checking sponsors:', error);
    }
}

checkSponsors();
