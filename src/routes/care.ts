import { Care, PrismaClient } from "@prisma/client"
import dayjs from "dayjs"
import express from "express"
import { HttpError } from "../errors/HttpError"
import missingParamsError from "../errors/missingParamsError"
import isAdmin from "../middlewares/isAdmin"
import isAuth from "../middlewares/isAuth"
import { isIntervalOverlaid, isIntervalValid } from "../utils/interval"

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

caresRoute.post("/", isAuth, isAdmin, async (req, res, next) => {
	try {
		const { patientId, caregiverId, startTime, endTime, weekday } = req.body as Care
		if (!patientId || !caregiverId || !startTime || !endTime || !weekday) throw missingParamsError

		const newCareInterval = { start: dayjs(startTime), end: dayjs(endTime) }
		if (!isIntervalValid(newCareInterval)) throw new HttpError(400, "Start or end date is invalid.")

		const patientCares = await prisma.care.findMany({ where: { patientId } })
		const conflitingPatientCare = patientCares.some((patientCare) => {
			const patientCareInterval = {
				start: dayjs(patientCare.startTime),
				end: dayjs(patientCare.endTime),
			}
			return isIntervalOverlaid(newCareInterval, patientCareInterval)
		})
		if (conflitingPatientCare)
			throw new HttpError(400, "Another patient care is occcupying the same period.")

		const caregiverCares = await prisma.care.findMany({ where: { caregiverId } })
		const conflitingCaregiverCare = caregiverCares.some((caregiverCare) => {
			const caregiverCareInterval = {
				start: dayjs(caregiverCare.startTime),
				end: dayjs(caregiverCare.endTime),
			}
			return isIntervalOverlaid(newCareInterval, caregiverCareInterval)
		})
		if (conflitingCaregiverCare)
			throw new HttpError(400, "Another caregiver care is occcupying the same period.")

		const care = await prisma.care.create({
			data: {
				Caregiver: { connect: { id: caregiverId } },
				Patient: { connect: { id: patientId } },
				startTime: newCareInterval.start.toDate(),
				endTime: newCareInterval.end.toDate(),
				weekday,
			},
		})
		return res.status(200).json(care)
	} catch (e) {
		next(e)
	}
})

export default caresRoute
