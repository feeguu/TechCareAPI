import express, { ErrorRequestHandler } from "express"
import caregiversRoute from "./routes/caregivers"
import userRoutes from "./routes/user"
import { HttpError } from "./errors/HttpError"
import patientsRoutes from "./routes/patients"

const app = express()

app.use(express.json())

app.use("/user", userRoutes)
app.use("/caregivers", caregiversRoute)
app.use("/patients", patientsRoutes)

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
	if (err instanceof HttpError) {
		return res.status(err.code).json({ error: err.message })
	}
	return res.status(500).json({ error: err.message })
}

app.use(errorHandler)

app.listen(3000, () => {
	console.log("Server running at port 3000")
})
