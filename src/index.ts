import express from "express"
import caregiverRoutes from "./routes/caregiver"
import userRoutes from "./routes/user"

const app = express()

app.use(express.json())

app.use("/user", userRoutes)
app.use("/caregiver", caregiverRoutes)

app.listen(3000, () => {
	console.log("Server running at port 3000")
})
