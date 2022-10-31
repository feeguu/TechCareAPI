import { PrismaClient } from "@prisma/client"
import express from "express"

const prisma = new PrismaClient()

const recordsRoutes = express.Router()

recordsRoutes.get("/patients/:patientId", async (req, res, next) => {
	try {
		const { patientId } = req.params as { patientId: string }
		const records = await prisma.medicalRecord.findMany({ where: { patientId } })

		if (res.locals.role === "CAREGIVER") {
			const filteredRecords = records.filter((record) => {
				return record.userId === res.locals.id
			})
            return res.status(200).json(filteredRecords)
		}

		return res.status(200).json(records)
	} catch (e) {
		next(e)
	}
})

export default recordsRoutes
