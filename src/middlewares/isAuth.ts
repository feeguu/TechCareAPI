import { PrismaClient } from "@prisma/client"
import { NextFunction, Request, Response } from "express"
import unautheticatedError from "../errors/unautheticatedError"
import { getUserId, validateToken } from "../utils/token"

const prisma = new PrismaClient()

export default async function isAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const token = req.headers.authorization?.split(" ")[1]
		if (token && validateToken(token)) {
			const user = await prisma.user.findUnique({ where: { id: getUserId(token) } })
			if (user) {
				res.locals.token = token
				res.locals.id = user.id
				res.locals.role = user.role
				return next()
			}
		}
		throw unautheticatedError
	} catch (e) {
		next(e)
	}
}
