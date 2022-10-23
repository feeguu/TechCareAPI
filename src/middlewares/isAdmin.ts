import { NextFunction, Request, Response } from "express"
import { getUserId } from "../utils/token"
import { PrismaClient } from "@prisma/client"
import unautheticatedError from "../errors/unautheticatedError"
import getRole from "../utils/getRole"

const prisma = new PrismaClient()

export default async function isAdmin(req: Request, res: Response, next: NextFunction) {
	try {
		const userId = getUserId(res.locals.token)
		const userRole = await getRole(userId)

		if (userRole !== "ADMIN") throw unautheticatedError

		next()
	} catch (e) {
		next(e)
	}
}
