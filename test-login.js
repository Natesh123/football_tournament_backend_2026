
const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:3000/auth/login', {
            email: 'footballtm00@gmail.com',
            password: 'wrongpassword' // Using wrong password to test lookup
        });
        console.log('Response:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testLogin();
