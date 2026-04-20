import prisma from '../utils/prisma'
import { validateOrThrow, createNetworkSchema, updateNetworkSchema } from '../validators'

export async function getNetworkInfos(serverId: number) {
  return prisma.networkInfo.findMany({
    where: { serverId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createNetworkInfo(rawData: any) {
  const data = validateOrThrow(createNetworkSchema, rawData)
  return prisma.networkInfo.create({ data })
}

export async function updateNetworkInfo(id: number, rawData: any) {
  const data = validateOrThrow(updateNetworkSchema, rawData)
  return prisma.networkInfo.update({
    where: { id },
    data,
  })
}

export async function deleteNetworkInfo(id: number) {
  return prisma.networkInfo.delete({ where: { id } })
}
