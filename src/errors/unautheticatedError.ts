import { HttpError } from "./HttpError";

const unautheticatedError = new HttpError(403, "You're not allowed to do this.")

export default unautheticatedError