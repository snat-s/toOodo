const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
const TOTAL_REQUESTS = 500;
const TOKEN = process.env.TOKEN;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;


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
async function generateAITodos() {
	const promises = [];
	const prompts = [
		"I am desperate to finish my homework. Help me be more productive and get it done!",
		"I have a big project due tomorrow and I'm struggling to make progress. What can I do to focus better?",
		"I keep getting distracted by social media and other websites while trying to study. How can I stay on task?",
		"I'm feeling overwhelmed by the amount of work I have to do. How can I break it down into manageable steps?",
		"I'm having trouble motivating myself to start working on my assignments. What can I do to get started?",
		"I've been procrastinating on my homework all week and now I'm in a time crunch. How can I get it done efficiently?",
		"I find it hard to concentrate on studying for long periods. What strategies can I use to improve my focus?",
		"I'm struggling to balance my homework with my other commitments. How can I manage my time better?",
		"I'm not sure how to prioritize my assignments. Can you help me figure out what to work on first?",
		"I'm feeling stressed and anxious about all the work I have to do. How can I stay calm and focused?",
		"I want to watch all of pokemon, what do i do?",
		"I am desperate to finish a lot of my projects. What do I do now?",
		"I am trying to study for my ethics exam. Where do I start? it is a cumulative",
		"I like to sing songs, but i want to learn the piano. Where do I start?",
		"I want to get healthy and loose 20 punds, how?",
		"I want to run a marathon. Add it to the list.",
		"I want to learn about lucid dreaming. How?"
	]

	const randomIndex = Math.floor(Math.random() * prompts.length);
	const prompt = prompts[randomIndex];

	const data = {
		model: 'Qwen/Qwen1.5-110B-Chat',
		messages: [
			{
				role: 'system',
				content: // 5-shot prompting es más que suficiente.
					`
				You are a wizard of productivity and give a single todo with the following format. Give the todo in 10 words or less:
				
				Sentence: My desk is really messy and I can't focus because of it.
				TODO: Organize your desk and put everything in its place.
				
				Sentence: I have a really big project and I want to finish it by tomorrow.
				TODO: Break your big project into small, manageable steps.
				
				Sentence: I can't focus I NEED to focus.
				TODO: Set a timer and focus intensely for 25 minutes.
				
				Sentence: I want to do stuff today but I don't know where to start.
				TODO: Make a list of your top 3 priorities today.
				
				Sentence: I am tired but I want to keep on working.
				TODO: Take a 10 minute break to recharge and refocus.
				
				Sentence:
				`
			},
			{
				role: 'user',
				content: prompt,
			}
		]
	};

	const response = await axios.post('https://api.together.xyz/v1/chat/completions', data, {
		headers: {
			'Authorization': `Bearer ${TOGETHER_API_KEY}`,
			'Content-Type': 'application/json'
		}
	});

	return response.data.choices[0].message.content;
}

async function generateTodos() {
	try {
		for (let i = 0; i < TOTAL_REQUESTS; i++) {
			const todoText = await generateAITodos();
			console.log(todoText);

			try {
				await axios.post(`${BASE_URL}/api/todos`, {
					text: todoText,
					isPublic: Math.random() < 0.5
				}, {
					headers: {
						Authorization: `${TOKEN}`
					}
				});

				await new Promise(resolve => setTimeout(resolve, 1000));
			} catch (error) {
				console.error(`Request failed with status code ${error.response.status}`);
			}
			
		}
		console.log(`Generated ${TOTAL_REQUESTS} todos`);
	} catch (error) {
		console.error('Error in main function:', error.message);
	}
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
		// await generateTodos();
		await simulateGetTodosRequests();
		// await deleteTodos();
	} catch (error) {
		console.error('Error in main function:', error.message);
	}
}
main();