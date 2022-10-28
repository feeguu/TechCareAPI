import dayjs, { Dayjs } from "dayjs"
import customParserFormat from "dayjs/plugin/customParseFormat"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"

type Interval = {
	start: Dayjs
	end: Dayjs
}

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(customParserFormat)

export function isIntervalValid({ start, end }: Interval): boolean {
	return (
		start.isValid() ||
		end.isValid() ||
		start.isSameOrAfter(dayjs()) ||
		end.isSameOrAfter(start) ||
		start.isSame(end, "day")
	)
}

export function isIntervalOverlaid(interval1: Interval, interval2: Interval): boolean {
	return (
		(interval1.start.isSameOrAfter(interval2.start) && interval1.start.isBefore(interval2.end)) ||
		(interval1.end.isAfter(interval2.start) && interval1.end.isSameOrBefore(interval2.end)) ||
		(interval1.start.isSameOrBefore(interval2.start) && interval1.end.isSameOrAfter(interval2.end))
	)
}

export function isIntervalBetween(interval1: Interval, interval2: Interval): boolean {
	return interval2.start.isSameOrAfter(interval1.start) && interval2.end.isSameOrBefore(interval1.end)
}

export function isActivityIntervalWithinCareInterval(
	activity: Interval,
	care: { start: Date; end: Date }
): boolean {
	const careStart = activity.start.hour(dayjs(care.start).hour()).minute(dayjs(care.start).minute())
	const careEnd = activity.end.hour(dayjs(care.end).hour()).minute(dayjs(care.end).minute())
	return isIntervalBetween({ start: careStart, end: careEnd }, activity)
}
