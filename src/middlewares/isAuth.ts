import { NextFunction, Request, Response } from "express"
import unautheticatedError from "../errors/unautheticatedError"
import { validateToken } from "../utils/token"

export default function isAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const token = req.headers.authorization?.split(" ")[1]

		if (token && validateToken(token)) {
			res.locals.token = token
			return next()
		}
		throw unautheticatedError
	} catch (e) {
		next(e)
	}
}
