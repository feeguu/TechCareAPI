import { PrismaClient, Severity } from "@prisma/client"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import express from "express"
import { HttpError } from "../errors/HttpError"
import missingParamsError from "../errors/missingParamsError"
import unauthorizedError from "../errors/unauthorizedError"

type RecordRequestBody = {
	date: string
	severity: Severity
	description: string
}

dayjs.extend(customParseFormat)

const prisma = new PrismaClient()

const recordsRoutes = express.Router()

recordsRoutes.get("/patients/:patientId", async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		const patient = await prisma.patient.findUnique({
			where: { id: patientId },
			include: { medicalRecords: true, care: true },
		})
		if (!patient) throw new HttpError(400, "Patient not found.")
		if (
			res.locals.role === "CAREGIVER" &&
			!patient.care.some((care) => care.caregiverId === res.locals.id)
		) {
			throw unauthorizedError
		}

		return res.status(200).json(patient.medicalRecords)
	} catch (e) {
		next(e)
	}
})

recordsRoutes.post("/patients/:patientId", async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		const { date, severity, description } = req.body as RecordRequestBody

		const patient = await prisma.patient.findUnique({ where: { id: patientId }, include: { care: true } })
		if (!patient) throw new HttpError(400, "Patient not found.")

		if (!date || !severity || !description) throw missingParamsError

		const parsedDate = dayjs(date, "YYYY-MM-DD")

		const sanitizedDescription = description.trim().replace(/\s{2,}/g, " ")

		if (severity != "SEVERE" && severity != "LIGHT" && severity != "MODERATE") {
			throw new HttpError(400, "Severity is invalid.")
		}

		if (
			res.locals.role === "CAREGIVER" &&
			!patient.care.some((care) => care.caregiverId === res.locals.id)
		) {
			throw unauthorizedError
		}

		const record = await prisma.medicalRecord.create({
			data: {
				date: parsedDate.toDate(),
				userId: res.locals.id,
				description: sanitizedDescription,
				severity,
				patientId,
			},
		})

		return res.status(200).json(record)
	} catch (e) {
		next(e)
	}
})

recordsRoutes.post("/:recordId", async (req, res, next) => {
	try {
		const { recordId } = req.params as { recordId: string }
		const record = await prisma.medicalRecord.findUnique({ where: { id: recordId } })
		if (!record) throw new HttpError(400, "Medical record not found.")

		const { date, severity, description } = req.body as RecordRequestBody

		if (!date || !severity || !description) throw missingParamsError

		const parsedDate = dayjs(date, "YYYY-MM-DD")

		const sanitizedDescription = description.trim().replace(/\s{2,}/g, " ")

		if (severity != "SEVERE" && severity != "LIGHT" && severity != "MODERATE") {
			throw new HttpError(400, "Severity is invalid.")
		}

		const newRecord = await prisma.medicalRecord.update({
			where: { id: recordId },
			data: {
				date: parsedDate.toDate(),
				description: sanitizedDescription,
				severity,
			},
		})

		return res.status(200).json(newRecord)
	} catch (e) {
		next(e)
	}
})

export default recordsRoutes
