import jwt from "jsonwebtoken"

export function generateToken(id: string) {
    return jwt.sign({}, process.env.SECRET_KEY!, {
        subject: id,
        issuer: "TechCare",
        expiresIn: "15d",
    })
}

export function validateToken(token: string) {
    try {
        jwt.verify(token, process.env.SECRET_KEY!)
    } catch (e) {
        return false
    }
    return true
}

export function getUserId(token: string) {
    const payload = jwt.verify(token, process.env.SECRET_KEY!)
    if (payload.sub) {
        return payload.sub.toString()
    }
    return false
}
