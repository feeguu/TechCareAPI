import express from "express"
import { verify } from "argon2"
import { PrismaClient } from "@prisma/client"
import { generateToken, getUserId } from "../utils/token"

type RequestBody = {
	username: string
	password: string
}

const prisma = new PrismaClient()

const userRoutes = express.Router()

userRoutes.post("/auth", async (req, res) => {
	const { username, password } = req.body as RequestBody

	if (!username || !password) {
		return res.status(400).json({ error: "Missing params" })
	}

	const user = await prisma.user.findUnique({ where: { username } })

	if (user && (await verify(user.password, password))) {
		return res.status(200).json({ token: generateToken(user.id) })
	}

	return res.status(401).json({ error: "Wrong username or password" })
})

userRoutes.get("/auth", async (req, res) => {
	const token = req.header("Authorization")?.split(" ")[1]
	if (!token) {
		return res.status(401).json({ authenticated: false })
	}
	const userId = getUserId(token) // Already checks if token is valid.

	if (!userId) {
		return res.status(401).json({ authenticated: false })
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			role: true,
			username: true,
			name: true,
			birthdate: true,
			contact: true,
		},
	})

	if (!user) {
		return res.status(401).json({ authenticated: false })
	}

	return res.status(200).json({ authenticated: true, user })
})

export default userRoutes
