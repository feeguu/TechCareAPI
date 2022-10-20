import { PrismaClient } from "@prisma/client"

import express, { Request, Response } from "express"
import isAdmin from "../middlewares/isAdmin"
import isAuth from "../middlewares/isAuth"

const prisma = new PrismaClient()

const caregiverRoutes = express.Router()

caregiverRoutes.post("/create", isAuth, isAdmin, (req: Request, res: Response) => {
	res.status(200).json({ successful: true })
})

export default caregiverRoutes
