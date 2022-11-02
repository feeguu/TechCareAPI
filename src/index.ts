import express, { ErrorRequestHandler } from "express"
import caregiversRoute from "./routes/caregivers"
import userRoutes from "./routes/user"
import { HttpError } from "./errors/HttpError"
import patientsRoutes from "./routes/patients"
import activitiesRoutes from "./routes/activities"
import caresRoute from "./routes/care"
import isAdmin from "./middlewares/isAdmin"
import isAuth from "./middlewares/isAuth"

const app = express()

app.use(express.json({limit: "4mb"}))

app.use("/user", userRoutes)
app.use("/caregivers", isAuth, caregiversRoute)
app.use("/patients", isAuth, patientsRoutes)
app.use("/activities", isAuth, activitiesRoutes)
app.use("/cares", isAuth, isAdmin, caresRoute)

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
