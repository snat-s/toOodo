const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
const TOTAL_REQUESTS = 500;
const TOKEN = process.env.TOKEN;

// Function to simulate load by sending GET requests to /todos endpoint
async function simulateGetTodosRequests() {
    
    const promises = [];
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
        promises.push(
            axios.get(`${BASE_URL}/api/todos`, {
                headers: {
                    Authorization: `${TOKEN}`
                }
            })
        );
    }

    await Promise.all(promises);
    console.log(`Completed ${TOTAL_REQUESTS} get todos requests`);
}

async function generateTodos() {
    const promises = [];
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
        const todoText = `Todo ${i + 1}`;

        promises.push(
            axios.post(`${BASE_URL}/api/todos`, {
                text: todoText,
                isPublic: Math.random() < 0.5 
            }, {
                headers: {
                    Authorization: `${TOKEN}`
                }
            })
        );
    }

    await Promise.all(promises);
    console.log(`Generated ${TOTAL_REQUESTS} todos`);
}

async function deleteTodos() {
    try {
        const response = await axios.get(`${BASE_URL}/api/todos`, {
            headers: {
                Authorization: `${TOKEN}`
            }
        });

        const todos = response.data;

        const deletePromises = todos.map(todo => {
            return axios.delete(`${BASE_URL}/api/todos/${todo._id}`, {
                headers: {
                    Authorization: `${TOKEN}`
                }
            });
        });

        await Promise.all(deletePromises);
        console.log(`Deleted ${todos.length} todos`);
    } catch (error) {
        console.error('Error deleting todos:', error.message);
    }
}

async function main() {
    try {
        await generateTodos();
        await simulateGetTodosRequests();
        await deleteTodos();
    } catch (error) {
        console.error('Error in main function:', error.message);
    }
}
main();