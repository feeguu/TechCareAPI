import { NextFunction, Request, Response } from "express"
import { getUserId } from "../utils/token"
import { PrismaClient } from "@prisma/client"
import unautheticatedError from "../errors/unautheticatedError"

const prisma = new PrismaClient()

export default async function isAdmin(req: Request, res: Response, next: NextFunction) {
	try {
		const userId = getUserId(res.locals.token)
		const user = await prisma.user.findUnique({ where: { id: userId } })

		if (user?.role !== "ADMIN") throw unautheticatedError

		next()
	} catch (e) {
		next(e)
	}
}
