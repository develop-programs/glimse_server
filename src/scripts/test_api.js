import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Add debug logging
const fetchWithLogging = async (url, options = {}) => {
  console.log(`Fetching ${url}...`);
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
};

async function testAPI() {
  console.log('Starting API tests...');
  // Test registration
  console.log('Testing registration...');
  const registerResponse = await fetchWithLogging(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    }),
  });
  
  const registerData = await registerResponse.json();
  console.log('Register response:', registerData);
  
  // If registration was successful, continue with login
  if (registerResponse.ok) {
    console.log('\nTesting login...');
    const loginResponse = await fetchWithLogging(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123'
      }),
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (loginResponse.ok && loginData.data && loginData.data.token) {
      // Save token for further requests
      const token = loginData.data.token;
      
      // Test room creation
      console.log('\nTesting room creation...');
      const createRoomResponse = await fetchWithLogging(`${BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'Test Room',
          description: 'A test room created via API'
        }),
      });
      
      const roomData = await createRoomResponse.json();
      console.log('Create room response:', roomData);
      
      if (createRoomResponse.ok && roomData.data && roomData.data._id) {
        const roomId = roomData.data._id;
        
        // Get all rooms
        console.log('\nGetting all rooms...');
        const roomsResponse = await fetchWithLogging(`${BASE_URL}/api/rooms`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const roomsData = await roomsResponse.json();
        console.log('Rooms response:', roomsData);
        
        // Test sending a message
        console.log('\nTesting message sending...');
        const messageResponse = await fetchWithLogging(`${BASE_URL}/api/messages/${roomId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content: 'Hello from the test API!'
          }),
        });
        
        const messageData = await messageResponse.json();
        console.log('Message response:', messageData);
        
        // Get messages
        console.log('\nGetting messages...');
        const getMessagesResponse = await fetchWithLogging(`${BASE_URL}/api/messages/${roomId}?page=1&limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const messagesData = await getMessagesResponse.json();
        console.log('Messages response:', messagesData);
        
        // Get user profile
        console.log('\nGetting user profile...');
        const profileResponse = await fetchWithLogging(`${BASE_URL}/api/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const profileData = await profileResponse.json();
        console.log('Profile response:', profileData);
      }
    }
  }
}

testAPI().catch(error => {
  console.error('Error running tests:', error);
});
