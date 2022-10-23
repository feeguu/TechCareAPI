import express, { ErrorRequestHandler } from "express"
import caregiverRoutes from "./routes/caregiver"
import userRoutes from "./routes/user"
import { HttpError } from "./errors/HttpError"

const app = express()

app.use(express.json())

app.use("/user", userRoutes)
app.use("/caregiver", caregiverRoutes)

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
