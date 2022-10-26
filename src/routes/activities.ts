import { PrismaClient } from "@prisma/client"
import express from "express"
import { HttpError } from "../errors/HttpError"
import isAuth from "../middlewares/isAuth"

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

export default activitiesRoutes
