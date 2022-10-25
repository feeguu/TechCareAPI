import { PrismaClient } from "@prisma/client"
import express from "express"
import isAuth from "../middlewares/isAuth"
import getRole from "../utils/getRole"
import { getUserId } from "../utils/token"

const prisma = new PrismaClient()

const patientsRoutes = express.Router()

patientsRoutes.get("/", isAuth, async (req, res, next) => {
    try {
        const userId = getUserId(res.locals.token)
        const role = await getRole(userId)
        if (role === "CAREGIVER") {
            const patients = await prisma.patient.findMany({ where: { care: { some: { caregiverId: userId } } } })
            return res.status(200).json(patients)
        }
        if (role === "ADMIN") {
            const patients = await prisma.patient.findMany()
            return res.status(200).json(patients)
        }

    } catch (e) {
        next(e)
    }
})



export default patientsRoutes