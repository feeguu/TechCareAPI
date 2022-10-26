import { PrismaClient, Role, User } from "@prisma/client"
import { hash } from "argon2"
import dayjs from "dayjs"
import customParserFormat from "dayjs/plugin/customParseFormat"
import express from "express"
import { HttpError } from "../errors/HttpError"
import missingParamsError from "../errors/missingParamsError"
import unautheticatedError from "../errors/unautheticatedError"
import isAdmin from "../middlewares/isAdmin"
import isAuth from "../middlewares/isAuth"
import getRole from "../utils/getRole"
import { getUserId } from "../utils/token"

const prisma = new PrismaClient()

const caregiversRoute = express.Router()

dayjs.extend(customParserFormat)

type CreateCaregiverRequestBody = {
	name: string
	birthdate: string
	contact: string
}

type UpdateCaregiverRequestBody = CreateCaregiverRequestBody & {
	role: Role
}

caregiversRoute.post("/", isAuth, isAdmin, async (req, res, next) => {
	try {
		const { name, birthdate, contact } = req.body as CreateCaregiverRequestBody

		if (!name || !birthdate || !contact) throw missingParamsError

		let sanitizedName = name
			.trim()
			.replace(/\s{2,}/g, " ")
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")

		let splittedName = sanitizedName.split(" ")

		if (splittedName.length === 1) throw new HttpError(400, "Name is invalid")

		const firstName = splittedName[0].toLowerCase()
		const lastName = splittedName[splittedName.length - 1].toLowerCase()
		const parsedBirthdate = dayjs(birthdate, "YYYY-MM-DD")

		const birthYear = parsedBirthdate.year()

		const username = `${firstName}.${lastName}`
		const password = `${firstName}${birthYear}`

		const numberOfSimilarUsers = await prisma.user.count({
			where: { username: { startsWith: username } },
		})

		const caregiver = await prisma.user.create({
			data: {
				role: "CAREGIVER",
				birthdate: parsedBirthdate.toDate(),
				contact,
				name: sanitizedName,
				password: await hash(password),
				username: `${username}${numberOfSimilarUsers + 1}`,
			},
		})

		return res.status(200).json(caregiver)
	} catch (e) {
		next(e)
	}
})

caregiversRoute.get("/", isAuth, isAdmin, async (req, res, next) => {
	try {
		const caregivers = await prisma.user.findMany({
			where: { role: { equals: "CAREGIVER" } },
			select: {
				id: true,
				name: true,
				role: true,
				username: true,
				contact: true,
				birthdate: true,
			},
		})

		return res.status(200).json(caregivers)
	} catch (e) {
		next(e)
	}
})

caregiversRoute.get("/:caregiverId", isAuth, async (req, res, next) => {
	try {
		const { caregiverId } = req.params as { caregiverId: string }
		const userReqId = res.locals.id

		if (userReqId !== caregiverId && res.locals.role !== "ADMIN") {
			throw unautheticatedError
		}

		const caregiver = await prisma.user.findUnique({
			where: { id: caregiverId },
			select: {
				id: true,
				name: true,
				role: true,
				username: true,
				contact: true,
			},
		})

		if (!caregiver || caregiver.role !== "CAREGIVER") throw new HttpError(400, "Caregiver not found.")

		return res.status(200).json(caregiver)
	} catch (e) {
		next(e)
	}
})

caregiversRoute.post("/:caregiverId", isAuth, isAdmin, async (req, res, next) => {
	try {
		const { name, birthdate, contact, role } = req.body as UpdateCaregiverRequestBody

		if (!name || !birthdate || !contact) throw missingParamsError

		const { caregiverId } = req.params as { caregiverId: string }
		const user = await prisma.user.findUnique({ where: { id: caregiverId } })

		if (!user || user.role !== "CAREGIVER") throw new HttpError(400, "Caregiver not found.")

		let sanitizedName = name.trim().replace(/\s{2,}/g, " ")
		const date = dayjs(birthdate, "YYYY-MM-DD").toDate()

		const caregiver = await prisma.user.update({
			where: { id: caregiverId },
			data: { name: sanitizedName, birthdate: date, contact: contact, role },
			select: {
				id: true,
				name: true,
				role: true,
				username: true,
				contact: true,
			},
		})

		return res.status(200).json(caregiver)
	} catch (e) {
		next(e)
	}
})

caregiversRoute.delete("/:caregiverId", isAuth, isAdmin, async (req, res, next) => {
	try {
		const { caregiverId } = req.params as { caregiverId: string }

		const user = await prisma.user.findUnique({ where: { id: caregiverId } })

		if (!user || user.role !== "CAREGIVER") throw new HttpError(400, "Caregiver not found.")

		const caregiver = await prisma.user.delete({ where: { id: caregiverId } })

		return res.status(204).json({})
	} catch (e) {
		next(e)
	}
})

caregiversRoute.get("/:caregiverId/patients", isAuth, async (req, res, next) => {
	try {
		const { caregiverId } = req.params as { caregiverId: string }
		if (res.locals.id === caregiverId || res.locals.role === "ADMIN") {
			const patients = await prisma.patient.findMany({ where: { care: { some: { caregiverId } } } })
			return res.status(200).json(patients)
		}
		throw unautheticatedError
	} catch (e) {
		next(e)
	}
})

export default caregiversRoute
