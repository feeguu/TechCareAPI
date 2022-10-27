import { PrismaClient } from "@prisma/client"
import dayjs from "dayjs"
import express from "express"
import { HttpError } from "../errors/HttpError"
import missingParamsError from "../errors/missingParamsError"
import isAuth from "../middlewares/isAuth"
import customParserFormat from "dayjs/plugin/customParseFormat"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"
import unauthorizedError from "../errors/unauthorizedError"

type ActivityRequestBody = {
	title: string
	description: string | null
	startDatetime: string
	endDatetime: string
}
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(customParserFormat)

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

//TODO: need to verify if already exists activity in the same period
activitiesRoutes.post("/patient/:patientId", isAuth, async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		const { title, description, startDatetime, endDatetime } = req.body as ActivityRequestBody

		if (!title || !description || !startDatetime || !endDatetime) throw missingParamsError

		const sanitizedTitle = title.trim().replace(/\s{2,}/g, " ")
		const sanitizedDescription = description.trim().replace(/\s{2,}/g, " ")

		const activityStart = dayjs(startDatetime, "YYYY-MM-DD HH:mm")
		const activityEnd = dayjs(endDatetime, "YYYY-MM-DD HH:mm")

		if (
			!activityStart.isValid() ||
			!activityEnd.isValid() ||
			activityStart.isBefore(dayjs()) ||
			activityEnd.isBefore(activityStart) ||
			!activityStart.isSame(activityEnd, "day")
		)
			throw new HttpError(400, "Start or end date is invalid.")

			const activities = await prisma.activity.findMany({ where: { patientId } })
			const conflitingActivity = activities.find((activity) => {
				return (
					(activityStart.isSameOrAfter(dayjs(activity.startDatetime)) &&
						activityStart.isBefore(dayjs(activity.endDatetime))) ||
					(activityEnd.isAfter(dayjs(activity.startDatetime)) &&
						activityEnd.isSameOrBefore(dayjs(activity.endDatetime))) ||
					(activityStart.isSameOrBefore(dayjs(activity.startDatetime)) &&
						activityEnd.isSameOrAfter(dayjs(activity.endDatetime)))
				)
			})

		if (conflitingActivity) throw new HttpError(400, "Another activity is occcupying the same period.")

		if (res.locals.role === "CAREGIVER") {
			const cares = await prisma.care.findMany({
				where: { patientId, caregiverId: res.locals.id, weekday: activityStart.day() },
			})
			if (cares.length === 0) throw unauthorizedError
			const validCare = cares.find((care) => {
				const careStart = activityStart
					.hour(dayjs(care.startTime).hour())
					.minute(dayjs(care.startTime).minute())
				const careEnd = activityEnd
					.hour(dayjs(care.endTime).hour())
					.minute(dayjs(care.endTime).minute())
				return careStart.isSameOrBefore(activityStart) && activityEnd.isSameOrBefore(careEnd)
			})
			if (!validCare) throw new HttpError(400, "Activity time is outside the care period.")
		}
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
