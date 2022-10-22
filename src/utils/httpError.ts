import { CustomError } from "ts-custom-error"

export class HttpError extends CustomError {
	public constructor(public code: number, message?: string) {
		super(message)
	}
}

