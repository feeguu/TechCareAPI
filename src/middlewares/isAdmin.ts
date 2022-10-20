import { NextFunction, Request, Response } from "express"
import { getUserId } from "../utils/token"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function isAdmin(req: Request, res: Response, next: NextFunction) {
	const userId = getUserId(res.locals.token)

	if (!userId) return res.status(403).json({ error: "You're not allowed to do this." })

	const user = await prisma.user.findUnique({ where: { id: userId } })

	if (user?.role !== "ADMIN") return res.status(403).json({ error: "You're not allowed to do this" })

	next()
}
