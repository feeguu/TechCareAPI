import { NextFunction, Request, Response } from "express"

export default function isAuth(req: Request, res: Response, next: NextFunction) {
	const token = req.headers.authorization?.split(" ")[1]

	if (!token) return res.status(403).json({ error: "You're not allowed to do this." })

	res.locals.token = token

	next()
}
