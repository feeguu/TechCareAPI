import express from "express"
import { hash, verify } from "argon2"
import { PrismaClient } from "@prisma/client"
import { generateToken, getUserId } from "../utils/token"
import isAuth from "../middlewares/isAuth"
import unautheticatedError from "../errors/unautheticatedError"
import { HttpError } from "../errors/HttpError"
import missingParamsError from "../errors/missingParamsError"

type LoginRequestBody = {
	username: string
	password: string
}
type ChangePasswordRequestBody = {
	oldPassword: string
	newPassword: string
}

const prisma = new PrismaClient()

const userRoutes = express.Router()

userRoutes.post("/auth", async (req, res, next) => {
	try {
		const { username, password } = req.body as LoginRequestBody

		if (!username || !password) {
			throw missingParamsError
		}

		const user = await prisma.user.findUnique({ where: { username } })

		if (user && (await verify(user.password, password))) {
			return res.status(200).json({ token: generateToken(user.id) })
		}

		throw new HttpError(401, "Wrong username or password.")
	} catch (e) {
		next(e)
	}
})

userRoutes.get("/auth", isAuth, async (req, res, next) => {
	try {
		const token = res.locals.token as string
		const userId = getUserId(token)

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
			throw unautheticatedError
		}

		return res.status(200).json({ authenticated: true, user })
	} catch (e) {
		next(e)
	}
})

userRoutes.post("/change-password", isAuth, async (req, res, next) => {
	try {
		const token = res.locals.token
		const userId = getUserId(token)

		const { oldPassword, newPassword } = req.body as ChangePasswordRequestBody

		if (!oldPassword || !newPassword) throw missingParamsError

		if (newPassword.length <= 8) throw new HttpError(403, "Password must be at least 8 characters long.")

		const user = await prisma.user.findUnique({
			where: { id: userId },
		})

		if (!(await verify(user!.password, oldPassword)))
			throw new HttpError(403, "Old password is incorrect.")

		await prisma.user.update({ where: { id: userId }, data: { password: await hash(newPassword) } })
		return res.status(200).json({successful: true})

	} catch (e) {
		next(e)
	}
})

export default userRoutes
