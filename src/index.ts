import express from "express"
import userRoutes from "./routes/user"

const app = express()
app.use(express.json())
app.use("/user", userRoutes)

app.listen(3000, () => {
    console.log("Server running at port 3000")
})
