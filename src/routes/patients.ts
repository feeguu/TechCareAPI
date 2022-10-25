import { PrismaClient, Severity } from "@prisma/client"
import dayjs from "dayjs"
import customParserFormat from "dayjs/plugin/customParseFormat"
import express from "express"
import { HttpError } from "../errors/HttpError"
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

patientsRoutes.post("/", isAuth, isAdmin, async (req, res, next) => {
	try {
		dayjs.extend(customParserFormat)
		const {
			name,
			birthdate,
			severity,
			bloodType,
			allergies,
			contact,
			height,
			medicines,
			weaknesses,
			weight,
		} = req.body as PatientRequestBody
		if (
			!name ||
			!birthdate ||
			!severity ||
			!bloodType ||
			!allergies ||
			!contact ||
			!height ||
			!medicines ||
			!weaknesses ||
			!weight
		) {
			throw missingParamsError
		}
		const date = dayjs(birthdate, "YYYY-MM-DD").toDate()
		const patient = await prisma.patient.create({
			data: {
				name,
				birthdate: date,
				severity,
				bloodType,
				allergies,
				contact,
				height,
				medicines,
				weaknesses,
				weight,
			},
		})
		return res.status(200).json(patient)
	} catch (e) {
		next(e)
	}
})

patientsRoutes.get("/:patientId", isAuth, async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		if (res.locals.role === "ADMIN") {
			const patient = await prisma.patient.findUnique({ where: { id: patientId } })
			if (!patient) throw new HttpError(400, "Patient not found.")
			return res.status(200).send(patient)
		}
		if (res.locals.role === "CAREGIVER") {
			const patients = await prisma.patient.findMany({
				where: { id: patientId, care: { some: { caregiverId: res.locals.id } } },
				take: 1,
			})	
			if (patients.length === 0) throw new HttpError(400, "Patient not found.")
			return res.status(200).send(patients[0])
		}
	} catch (e) {
		next(e)
	}
})

export default patientsRoutes
