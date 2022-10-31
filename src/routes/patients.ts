import { PrismaClient, Severity } from "@prisma/client"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import express from "express"
import { HttpError } from "../errors/HttpError"
import missingParamsError from "../errors/missingParamsError"
import unauthorizedError from "../errors/unauthorizedError"
import isAdmin from "../middlewares/isAdmin"
import isAuth from "../middlewares/isAuth"

type PatientRequestBody = {
	name: string
	birthdate: string
	severity: Severity
	bloodType: string
	allergies?: string
	contact: string
	height: number
	medicines?: string
	weaknesses?: string
	weight: number
}

const prisma = new PrismaClient()

const patientsRoutes = express.Router()

dayjs.extend(customParseFormat)

patientsRoutes.get("/", isAuth, async (req, res, next) => {
	try {
		const patients = await prisma.patient.findMany({ include: { care: true } })

		if (res.locals.role === "CAREGIVER") {
			const filteredPatients = patients.filter((patient) => {
				return patient.care.find((care) => care.caregiverId === res.locals.id)
			})
			return res.status(200).json(filteredPatients)
		}

		return res.status(200).json(patients)
	} catch (e) {
		next(e)
	}
})

patientsRoutes.post("/", isAuth, isAdmin, async (req, res, next) => {
	try {
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
		if (!name || !birthdate || !severity || !bloodType || !contact || !height || !weight) {
			throw missingParamsError
		}
		if (severity != "SEVERE" && severity != "LIGHT" && severity != "MODERATE") {
			throw new HttpError(400, "Severity is invalid.")
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
		const patient = await prisma.patient.findUnique({ where: { id: patientId }, include: { care: true } })
		if (!patient) throw new HttpError(400, "Patient not found.")

		if (
			res.locals.role === "CAREGIVER" &&
			!patient.care.some((care) => care.caregiverId === res.locals.id)
		)
			throw unauthorizedError

		return res.status(200).send(patient)
	} catch (e) {
		next(e)
	}
})

patientsRoutes.post("/:patientId", isAuth, async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		const {
			name,
			birthdate,
			bloodType,
			allergies,
			contact,
			height,
			medicines,
			severity,
			weaknesses,
			weight,
		} = req.body as PatientRequestBody
		if (!name || !birthdate || !severity || !bloodType || !contact || !height || !weight) {
			throw missingParamsError
		}
		if (severity != "SEVERE" && severity != "LIGHT" && severity != "MODERATE") {
			throw new HttpError(400, "Severity is invalid.")
		}
		const date = dayjs(birthdate, "YYYY-MM-DD").toDate()
		const patient = await prisma.patient.findUnique({
			where: { id: patientId },
			include: { care: true },
		})
		if (!patient) throw new HttpError(400, "Patient not found.")
		if (
			res.locals.role === "CAREGIVER" &&
			!patient.care.find((care) => care.caregiverId === res.locals.id)
		) {
			throw unauthorizedError
		}
		const updatedPatient = await prisma.patient.update({
			where: { id: patientId },
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

		return res.status(200).json(updatedPatient)
	} catch (e) {
		next(e)
	}
})

patientsRoutes.delete("/:patientId", isAuth, isAdmin, async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }

		const patient = await prisma.patient.findUnique({ where: { id: patientId } })
		if (!patient) throw new HttpError(400, "Patient not found.")

		await prisma.patient.delete({ where: { id: patientId } })

		return res.status(204).json({})
	} catch (e) {
		next(e)
	}
})

patientsRoutes.get("/:patientId/caregivers", isAuth, isAdmin, async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		const patient = await prisma.patient.findUnique({
			where: { id: patientId },
			include: { care: { include: { Caregiver: true } } },
		})
		if (!patient) throw new HttpError(400, "Patient not found")
		return res.status(200).json(patient.care.map((care) => care.Caregiver))
	} catch (e) {
		next(e)
	}
})

export default patientsRoutes
