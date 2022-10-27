import { NextFunction, Request, Response } from "express"
import { Role } from "@prisma/client"
import unauthorizedError from "../errors/unauthorizedError"


export default async function isAdmin(req: Request, res: Response, next: NextFunction) {
	try {
		const userRole = res.locals.role as Role
		if (userRole !== "ADMIN") throw unauthorizedError
		next()
	} catch (e) {
		next(e)
	}
}
