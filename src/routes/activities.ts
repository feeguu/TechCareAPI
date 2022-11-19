import { PrismaClient } from "@prisma/client"
import dayjs from "dayjs"
import express from "express"
import { HttpError } from "../errors/HttpError"
import missingParamsError from "../errors/missingParamsError"
import customParseFormat from "dayjs/plugin/customParseFormat"
import unauthorizedError from "../errors/unauthorizedError"
import {
	isActivityIntervalWithinCareInterval,
	isActivityOverlaidWithCareInterval,
	isIntervalOverlaid,
	isIntervalValid,
} from "../utils/interval"

type ActivityRequestBody = {
	title: string
	description: string | null
	startDatetime: string
	endDatetime: string
}

dayjs.extend(customParseFormat)

const prisma = new PrismaClient()

const activitiesRoutes = express.Router()

activitiesRoutes.get("/patient/:patientId", async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		const activitiesFromPatient = await prisma.activity.findMany({
			where: { patientId },
			include: { Patient: { include: { care: true } } },
		})
		if (res.locals.CAREGIVER) {
			const filteredActivities = activitiesFromPatient.filter((activity) => {
				const activityStart = dayjs(activity.startDatetime)
				const activityEnd = dayjs(activity.endDatetime)
				return activity.Patient.care.some((care) => {
					return (
						care.caregiverId === res.locals.id &&
						dayjs(activity.startDatetime).day() === care.weekday &&
						isActivityOverlaidWithCareInterval(
							{ start: activityStart, end: activityEnd },
							{ start: care.startTime, end: care.endTime }
						)
					)
				})
			})
			return res.status(200).json(filteredActivities)
		}
		return res.status(200).json(activitiesFromPatient)
	} catch (e) {
		next(e)
	}
})

activitiesRoutes.post("/patient/:patientId", async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		const { title, description, startDatetime, endDatetime } = req.body as ActivityRequestBody

		if (!title || !startDatetime || !endDatetime) throw missingParamsError

		const sanitizedTitle = title.trim().replace(/\s{2,}/g, " ")
		const sanitizedDescription = description?.trim().replace(/\s{2,}/g, " ")

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
				return isActivityIntervalWithinCareInterval(
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
		return res.status(200).json(patient.activities)
	} catch (e) {
		next(e)
	}
})

activitiesRoutes.get("/caregiver/:caregiverId", async (req, res, next) => {
	try {
		const { caregiverId } = req.params as { caregiverId: string }
		if (res.locals.role === "CAREGIVER" && caregiverId !== res.locals.id) throw unauthorizedError
		const activitiesFromRelatedPatients = await prisma.activity.findMany({
			where: { Patient: { care: { some: { caregiverId } } } },
			include: { Patient: { include: { care: true } } },
		})

		const filteredActivities = activitiesFromRelatedPatients.filter((activity) => {
			const activityStart = dayjs(activity.startDatetime)
			const activityEnd = dayjs(activity.endDatetime)
			return activity.Patient.care.some((care) => {
				return (
					activityStart.day() === care.weekday &&
					isActivityOverlaidWithCareInterval(
						{ start: activityStart, end: activityEnd },
						{ start: care.startTime, end: care.endTime }
					)
				)
			})
		})
		return res.status(200).json(filteredActivities)
	} catch (e) {
		next(e)
	}
})

activitiesRoutes.post("/:activityId", async (req, res, next) => {
	try {
		const { activityId } = req.params as { activityId: string }
		const { title, description, startDatetime, endDatetime } = req.body as ActivityRequestBody

		if (!title || !startDatetime || !endDatetime) throw missingParamsError

		const sanitizedTitle = title.trim().replace(/\s{2,}/g, " ")
		const sanitizedDescription = description?.trim().replace(/\s{2,}/g, " ")

		const newActivityStart = dayjs(startDatetime, "YYYY-MM-DD HH:mm")
		const newActivityEnd = dayjs(endDatetime, "YYYY-MM-DD HH:mm")

		if (!isIntervalValid({ start: newActivityStart, end: newActivityEnd }))
			throw new HttpError(400, "Start or end date is invalid.")

		const activity = await prisma.activity.findUnique({
			where: { id: activityId },
			include: { Patient: { include: { care: true } } },
		})

		if (!activity) throw new HttpError(400, "Activity not found.")
		if (res.locals.role === "CAREGIVER") {
			const activityStart = dayjs(activity.startDatetime)
			const activityEnd = dayjs(activity.endDatetime)

			//Check if caregiver is responsable
			const validCare = activity.Patient.care.find((care) => {
				return (
					isActivityIntervalWithinCareInterval(
						{ start: activityStart, end: activityEnd },
						{ start: care.startTime, end: care.endTime }
					) &&
					activityStart.day() === care.weekday &&
					care.caregiverId === res.locals.id
				)
			})
			if (!validCare) throw unauthorizedError

			//Check if new activity overlay care interval
			if (
				!isActivityIntervalWithinCareInterval(
					{ start: newActivityStart, end: newActivityEnd },
					{ start: validCare.startTime, end: validCare.endTime }
				)
			)
				throw new HttpError(400, "Another activity is occcupying the same period.")
		}

		const patientActivities = await prisma.activity.findMany({ where: { patientId: activity.patientId } })
		const conflitingActivity = patientActivities.find((patientActivity) => {
			return (
				patientActivity.id !== activityId &&
				isIntervalOverlaid(
					{ start: dayjs(patientActivity.startDatetime), end: dayjs(patientActivity.endDatetime) },
					{ start: newActivityStart, end: newActivityEnd }
				)
			)
		})
		if (conflitingActivity) throw new HttpError(400, "Another activity is occcupying the same period.")

		const newActivity = await prisma.activity.update({
			where: {
				id: activityId,
			},
			data: {
				title: sanitizedTitle,
				description: sanitizedDescription,
				startDatetime: newActivityStart.toDate(),
				endDatetime: newActivityEnd.toDate(),
				Patient: {
					connect: { id: activity.patientId },
				},
			},
		})

		return res.status(200).json(newActivity)
	} catch (e) {
		next(e)
	}
})

activitiesRoutes.delete("/:activityId", async (req, res, next) => {
	try {
		const { activityId } = req.params as { activityId: string }
		const activity = await prisma.activity.findUnique({
			where: { id: activityId },
			include: { Patient: { include: { care: true } } },
		})

		if (!activity) throw new HttpError(400, "Activity not found.")

		if (res.locals.role === "CAREGIVER") {
			const activityStart = dayjs(activity.startDatetime)
			const activityEnd = dayjs(activity.endDatetime)

			//Check if caregiver is responsable
			const validCare = activity.Patient.care.find((care) => {
				return (
					isActivityIntervalWithinCareInterval(
						{ start: activityStart, end: activityEnd },
						{ start: care.startTime, end: care.endTime }
					) &&
					activityStart.day() === care.weekday &&
					care.caregiverId === res.locals.id
				)
			})

			if (!validCare) throw unauthorizedError
		}

		await prisma.activity.delete({ where: { id: activityId } })

		return res.status(204).json({})
	} catch (e) {
		next(e)
	}
})

export default activitiesRoutes
