import { PrismaClient, Severity } from "@prisma/client"
import dayjs from "dayjs"
import customParserFormat from "dayjs/plugin/customParseFormat"
import express from "express"
import missingParamsError from "../errors/missingParamsError"
import isAdmin from "../middlewares/isAdmin"
import isAuth from "../middlewares/isAuth"

type PatientRequestBody = {
	name: string
	birthdate: string
	severity: Severity
	bloodType: string
	allergies: string
	contact: string
	height: number
	medicines: string
	weaknesses: string
	weight: number
}

const prisma = new PrismaClient()

const patientsRoutes = express.Router()

patientsRoutes.get("/", isAuth, async (req, res, next) => {
	try {
		const patients = await prisma.patient.findMany()
		return res.status(200).json(patients)
	} catch (e) {
		next(e)
	}
})


export default patientsRoutes
