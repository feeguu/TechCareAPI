import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function getRole(id: string | undefined): Promise<"ADMIN" | "CAREGIVER" | undefined> {
	const user = await prisma.user.findUnique({ where: { id } })
	if(!user) return undefined
	return user.role
}
