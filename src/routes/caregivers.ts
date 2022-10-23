import { PrismaClient } from "@prisma/client"
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

type CreateCaregiverRequestBody = {
	name: string
	birthdate: string
	contact: string
}

caregiversRoute.post("/", isAuth, isAdmin, async (req, res, next) => {
	try {
		dayjs.extend(customParserFormat)
		const { name, birthdate, contact } = req.body as CreateCaregiverRequestBody

		if (!name || !birthdate || !contact) throw missingParamsError

		let sanitizedName = name.trim().replace(/\s{2,}/g, " ")

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
			},
		})

		return res.status(200).json(caregivers)
	} catch (e) {
		next(e)
	}
})

caregiversRoute.get("/:caregiverId", isAuth, async (req, res, next) => {
	try {
		const { caregiverId } = req.params
		const userReqId = getUserId(res.locals.token)
		if (userReqId !== caregiverId && (await getRole(userReqId)) !== "ADMIN") {
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
		if (caregiver?.role === "ADMIN") {
			return res.status(200).json({})
		}
		return res.status(200).json(caregiver)
	} catch (e) {
		next(e)
	}
})

export default caregiversRoute
