const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

let dbClient;

async function connectToDatabase() {
	try {
		await client.connect();
		console.log("Connected to MongoDB");
		dbClient = client;
	} catch (err) {
		console.error("Error connecting to MongoDB:", err);
		process.exit(1); // Exit the process if unable to connect
	}
}

connectToDatabase();

const app = express();

// middleware
const authenticateToken = (req, res, next) => {
	const token = req.headers["authorization"];
	if (!token) return res.status(401).send("Access denied. Token is missing.");

	jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
		if (err) return res.status(403).send("Invalid token.");
		req.userId = decoded.id;
		next();
	});
};

const authenticatedRouter = express.Router();
authenticatedRouter.use(authenticateToken);
const accessLogStream = fs.createWriteStream(
	path.join(__dirname, "access.log"),
	{ flags: "a" }
  );
  
app.use(morgan("combined", {stream: accessLogStream}));
app.use(express.static("public"));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Get all todos
authenticatedRouter.get("/todos", async (req, res) => {
	try {
		const todos = await dbClient
			.db("toodo")
			.collection("todos")
			.find({ userId: req.userId })
			.toArray();
		res.json(todos);
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
});
// contact
app.post("/contact", async (req, res) => {
	try {
		const { email, message } = req.body;
		const result = await dbClient.db("toodo").collection("contact").insertOne({ email: email, message: message });
		res.status(201).json(result.acknowledged);
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
});

// public todos
app.get("/public/:user", async (req, res) => {
	try {
		const username = req.params.user;

		const user = await dbClient
			.db("toodo")
			.collection('users')
			.findOne({ username });

		if (!user) {
			return res.status(404).send('User not found');
		}
		const userId = user._id;

		const todos = await dbClient
			.db("toodo")
			.collection("todos")
			.find({ userId: userId.toString(), isPublic: true })
			.toArray();
		res.json(todos);
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
});

// Create a new todo
authenticatedRouter.post("/todos", async (req, res) => {
	try {
		const { text, isPublic } = req.body;
		const todo = {
			content: text,
			userId: req.userId,
			isPublic: isPublic,
		};
		const result = await dbClient.db("toodo").collection("todos").insertOne(todo);
		res.status(201).json(result.acknowledged);
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
});

// Get a specific todo
authenticatedRouter.get("/todo/:id", async (req, res) => {
	try {
		const todo = await dbClient
			.db("toodo")
			.collection("todos")
			.findOne({ _id: new ObjectId(req.params.id) });
		if (!todo) {
			return res.status(404).send("Todo not found");
		}
		res.json(todo);
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
});

// Update a specific todo
authenticatedRouter.put("/todos/:id", async (req, res) => {
	try {

		// Extract the fields you want to update from req.body
		const { content, isPublic } = req.body;

		// Create an object with the fields to be updated
		const updatedFields = {};
		if (content) updatedFields.content = content;
		if (isPublic !== undefined) updatedFields.isPublic = isPublic;

		// Check if there are fields to update
		if (Object.keys(updatedFields).length === 0) {
			return res.status(400).json({ error: "No valid fields to update" });
		}

		const result = await dbClient
			.db("toodo")
			.collection("todos")
			.updateOne(
				{ _id: new ObjectId(req.params.id), userId: req.userId },
				{ $set: updatedFields },
			);

		// Check if the todo was found and updated
		if (result.modifiedCount === 0) {
			return res.status(404).send("Todo not found or not authorized to update");
		}

		res.json({ message: "Todo updated successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
});

// Delete a specific todo
authenticatedRouter.delete("/todos/:id", async (req, res) => {
	try {
		const result = await dbClient
			.db("toodo")
			.collection("todos")
			.deleteOne({ _id: new ObjectId(req.params.id) });
		if (result.deletedCount === 0) {
			return res.status(404).send("Todo not found");
		}
		res.json({ message: "Todo deleted successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
});

// signup
app.post("/signup", async (req, res) => {
	try {
		const { username, password } = req.body;

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Check if a user with the same username already exists
		const existingUser = await dbClient
			.db("toodo")
			.collection("users")
			.findOne({ username });

		if (existingUser) {
			return res.status(400).send("Username already taken");
		}

		// Insert the new user into the database
		const result = await client.db("toodo").collection("users").insertOne({
			username,
			password: hashedPassword,
		});

		if (result.acknowledged === true) {
			res.status(201).send("User created successfully");
		} else {
			res.status(500).send("Failed to create user");
		}
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
});

// login
app.post("/login", async (req, res) => {
	try {
		const { username, password } = req.body;


		// Find the user by username
		const user = await dbClient
			.db("toodo")
			.collection("users")
			.findOne({ username });

		if (!user) {
			// If no user is found, return an error
			return res.status(400).send("Invalid username or password");
		}

		// Compare the provided password with the stored hashed password
		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			// If the passwords do not match, return an error
			return res.status(400).send("Invalid username or password");
		}

		// If the credentials are valid, generate a token
		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
			expiresIn: "72h",
		});

		// Send the token to the client
		res.json({ token });
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
});

app.use("/api", authenticatedRouter);

process.on("SIGINT", async () => {
	if (dbClient) {
		await dbClient.close();
		console.log("MongoDB connection closed");
	}
	process.exit(0);
});

// start server
app.listen(PORT, () => {
	console.log(`Listening on port: ${PORT}`);
});
