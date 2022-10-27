import { PrismaClient } from "@prisma/client"
import dayjs from "dayjs"
import express from "express"
import { HttpError } from "../errors/HttpError"
import missingParamsError from "../errors/missingParamsError"
import isAuth from "../middlewares/isAuth"
import unauthorizedError from "../errors/unauthorizedError"
import { isActivityIntervalWithinCareInterval, isIntervalOverlaid, isIntervalValid } from "../utils/interval"

type ActivityRequestBody = {
	title: string
	description: string | null
	startDatetime: string
	endDatetime: string
}

const prisma = new PrismaClient()

const activitiesRoutes = express.Router()

activitiesRoutes.get("/patient/:patientId", isAuth, async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		const activities = await prisma.activity.findMany({
			where: { patientId },
			include: { Patient: { include: { care: true } } },
		})
		if (res.locals.role === "ADMIN") {
			return res.status(200).json(activities)
		}
		if (res.locals.role === "CAREGIVER") {
			const filteredActivities = activities.filter((activity) => {
				return activity.Patient.care.find((care) => {
					return care.caregiverId === res.locals.id
				})
			})
			return res.status(200).json(filteredActivities)
		}

		throw new HttpError(400, "Patient not found.")
	} catch (e) {
		next(e)
	}
})

activitiesRoutes.post("/patient/:patientId", isAuth, async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		const { title, description, startDatetime, endDatetime } = req.body as ActivityRequestBody

		if (!title || !description || !startDatetime || !endDatetime) throw missingParamsError

		const sanitizedTitle = title.trim().replace(/\s{2,}/g, " ")
		const sanitizedDescription = description.trim().replace(/\s{2,}/g, " ")

		const activityStart = dayjs(startDatetime, "YYYY-MM-DD HH:mm")
		const activityEnd = dayjs(endDatetime, "YYYY-MM-DD HH:mm")

		if (!isIntervalValid({ start: activityStart, end: activityEnd }))
			throw new HttpError(400, "Start or end date is invalid.")

		const activities = await prisma.activity.findMany({ where: { patientId } })

		const conflitingActivity = activities.find((activity) => {
			return isIntervalOverlaid(
				{ start: activityStart, end: activityEnd },
				{ start: dayjs(activity.startDatetime), end: dayjs(activity.endDatetime) }
			)
		})

		if (res.locals.role === "CAREGIVER") {
			const cares = await prisma.care.findMany({
				where: { patientId, caregiverId: res.locals.id, weekday: activityStart.day() },
			})
			if (cares.length === 0) throw unauthorizedError
			const validCare = cares.find((care) => {
				isActivityIntervalWithinCareInterval(
					{ start: activityStart, end: activityEnd },
					{ start: care.startTime, end: care.endTime }
				)
			})
			if (!validCare) throw new HttpError(400, "Activity time is outside the care period.")
		}
		
		if (conflitingActivity) throw new HttpError(400, "Another activity is occcupying the same period.")

		const patient = await prisma.patient.update({
			where: { id: patientId },
			data: {
				activities: {
					create: {
						title: sanitizedTitle,
						description: sanitizedDescription,
						startDatetime: activityStart.toDate(),
						endDatetime: activityEnd.toDate(),
					},
				},
			},
			include: {
				activities: true,
			},
		})
		return res.status(200).json(patient)
	} catch (e) {
		next(e)
	}
})

export default activitiesRoutes
