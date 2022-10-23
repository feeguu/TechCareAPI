import { HttpError } from "./HttpError";

const missingParamsError = new HttpError(400, "Missing params.")

export default missingParamsError