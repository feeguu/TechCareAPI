import { HttpError } from "./HttpError"

const unauthorizedError = new HttpError(403, "You're not allowed to do this.")

export default unauthorizedError
