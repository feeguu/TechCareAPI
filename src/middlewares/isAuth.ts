import { PrismaClient } from "@prisma/client"
import { NextFunction, Request, Response } from "express"
import unautheticatedError from "../errors/unautheticatedError"
import { getUserId, validateToken } from "../utils/token"

const prisma = new PrismaClient()

export default async function isAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const token = req.headers.authorization?.split(" ")[1]
		if (token && validateToken(token)) {
			if (await prisma.user.findUnique({ where: { id: getUserId(token) } })) {
				res.locals.token = token
				return next()
			
		}}
		throw unautheticatedError
	} catch (e) {
		next(e)
	}
}
