import prisma from '../utils/prisma'
import { validateOrThrow, createAppSchema, updateAppSchema } from '../validators'

export async function getApplications(serverId: number) {
  return prisma.application.findMany({
    where: { serverId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createApplication(rawData: any) {
  const data = validateOrThrow(createAppSchema, rawData)
  return prisma.application.create({ data })
}

export async function updateApplication(id: number, rawData: any) {
  const data = validateOrThrow(updateAppSchema, rawData)
  return prisma.application.update({
    where: { id },
    data,
  })
}

export async function deleteApplication(id: number) {
  return prisma.application.delete({ where: { id } })
}
