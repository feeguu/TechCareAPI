import express, { Request, Response } from "express"
import caregiverRoutes from "./routes/caregiver"
import userRoutes from "./routes/user"
import { HttpError } from "./utils/httpError"

const app = express()

app.use(express.json())

app.use((err: Error, req: Request, res: Response) => {
	if (err instanceof HttpError) {
		return res.status(err.code).json({ error: err.message })
	}
	return res.status(500).json({ error: err.message })
})

app.use("/user", userRoutes)
app.use("/caregiver", caregiverRoutes)

app.listen(3000, () => {
	console.log("Server running at port 3000")
})
