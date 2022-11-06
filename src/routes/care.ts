import { Care, PrismaClient } from "@prisma/client"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import express from "express"
import { HttpError } from "../errors/HttpError"
import missingParamsError from "../errors/missingParamsError"
import { isIntervalOverlaid } from "../utils/interval"
import activitiesRoutes from "./activities"

type Ids = {
	patientId: string
	caregiverId: string
}

// dayjs.extend(utc)
// dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const prisma = new PrismaClient()

const caresRoute = express.Router()

//Get all cares passing the caregiverId and patientId
caresRoute.get("/", async (req, res, next) => {
	try {
		const { patientId, caregiverId } = req.body as Ids

		const patient = await prisma.patient.findUnique({ where: { id: patientId } })
		if (!patient) throw new HttpError(400, "Patient not found.")
		const caregiver = await prisma.user.findUnique({ where: { id: caregiverId } })
		if (caregiver?.role !== "CAREGIVER") throw new HttpError(400, "Caregiver not found.")

		const cares = await prisma.care.findMany({ where: { patientId, caregiverId } })
		return res.status(200).json(cares)
	} catch (e) {
		next(e)
	}
})

caresRoute.post("/", async (req, res, next) => {
	try {
		const { patientId, caregiverId, startTime, endTime, weekday } = req.body as Care

		if (!patientId || !caregiverId || !startTime || !endTime || weekday === undefined ) throw missingParamsError

		if (
			!startTime.match(/^(0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]/g) ||
			!endTime.match(/^(0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]/g)
		)
			throw new HttpError(400, "Start or date is invalid")

		const start = dayjs(startTime, "HH:mm")
		const end = dayjs(endTime, "HH:mm")
		if (weekday < 0 || weekday > 6) throw new HttpError(400, "Weekday is invalid.")

		if (!start.isValid() || !end.isValid || start.isAfter(end))
			throw new HttpError(400, "Start or end date is invalid.")

		if (!(await prisma.patient.findUnique({ where: { id: patientId } })))
			throw new HttpError(400, "Patient not found.")
		if ((await prisma.user.findUnique({ where: { id: caregiverId } }))?.role !== "CAREGIVER")
			throw new HttpError(400, "Caregiver not found.")

		const weekdayCares = await prisma.care.findMany({ where: { weekday } })
		const hasConflictingCare = weekdayCares.some((care) => {
			return (
				(patientId === care.patientId || caregiverId === care.caregiverId) &&
				isIntervalOverlaid(
					{ start, end },
					{ start: dayjs(care.startTime, "HH:mm"), end: dayjs(care.endTime, "HH:mm") }
				)
			)
		})
		if (hasConflictingCare) throw new HttpError(400, "Another care is occupying the same period.")

		const care = await prisma.care.create({
			data: {
				patientId,
				caregiverId,
				startTime,
				endTime,
				weekday,
			},
		})

		return res.status(200).json(care)
	} catch (e) {
		next(e)
	}
})

caresRoute.post("/:careId", async (req, res, next) => {
	try {
		const { careId } = req.params as { careId: string }

		const care = await prisma.care.findUnique({ where: { id: careId } })
		if (!care) throw new HttpError(400, "Care not found.")

		const { patientId, caregiverId, startTime, endTime, weekday } = req.body as Care
		if (!patientId || !caregiverId || !startTime || !endTime || weekday === undefined ) throw missingParamsError

		const start = dayjs(startTime, "HH:mm")
		const end = dayjs(endTime, "HH:mm")

		if (weekday < 0 || weekday > 6) throw new HttpError(400, "Weekday is invalid.")

		if (!start.isValid() || !end.isValid || start.isAfter(end))
			throw new HttpError(400, "Start or end date is invalid.")

		if (!(await prisma.patient.findUnique({ where: { id: patientId } })))
			throw new HttpError(400, "Patient not found.")
		if ((await prisma.user.findUnique({ where: { id: caregiverId } }))?.role !== "CAREGIVER")
			throw new HttpError(400, "Caregiver not found.")

		const weekdayCares = await prisma.care.findMany({ where: { weekday } })
		const hasConflictingCare = weekdayCares.some((care) => {
			return (
				(patientId === care.patientId || caregiverId === care.caregiverId) &&
				isIntervalOverlaid(
					{ start, end },
					{ start: dayjs(care.startTime, "HH:mm"), end: dayjs(care.endTime, "HH:mm") }
				)
			)
		})
		if (hasConflictingCare) throw new HttpError(400, "Another care is occupying the same period.")

		const newCare = await prisma.care.update({
			where: { id: careId },
			data: {
				Caregiver: { connect: { id: caregiverId } },
				Patient: { connect: { id: patientId } },
				startTime,
				endTime,
				weekday,
			},
		})
		return res.status(200).json(newCare)
	} catch (e) {
		next(e)
	}
})

caresRoute.delete("/:careId", async (req, res, next) => {
	try {
		const { careId } = req.params as { careId: string }
		const care = await prisma.care.findUnique({ where: { id: careId } })
		if (!care) throw new HttpError(400, "Care not found.")
		await prisma.care.delete({ where: { id: careId } })
		return res.status(204).json({})
	} catch (e) {
		next(e)
	}
})

export default caresRoute
