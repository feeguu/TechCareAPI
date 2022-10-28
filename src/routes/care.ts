import { PrismaClient } from "@prisma/client"
import express from "express"
import isAdmin from "../middlewares/isAdmin"
import isAuth from "../middlewares/isAuth"

type Ids = {
	patientId: string
	caregiverId: string
}

const prisma = new PrismaClient()

const caresRoute = express.Router()

//Get all cares passing the caregiverId and patientId
caresRoute.get("/", isAuth, isAdmin, async (req, res, next) => {
	const { patientId, caregiverId } = req.body as Ids
	const cares = await prisma.care.findMany({ where: { patientId, caregiverId } })
    return res.status(200).json(cares)
})

export default caresRoute
