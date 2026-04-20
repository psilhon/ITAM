import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as serverService from '../server.service'
import prisma from '../../utils/prisma'

// Mock Prisma
vi.mock('../../utils/prisma', () => ({
  default: {
    server: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    fieldValue: {
      upsert: vi.fn(),
    },
  },
}))

describe('Server Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCompanyList', () => {
    it('should return unique company list', async () => {
      const mockCompanies = [
        { company: 'Tech Corp' },
        { company: 'Data Inc' },
        { company: null },
      ]
      vi.mocked(prisma.server.findMany).mockResolvedValue(mockCompanies as never)

      const result = await serverService.getCompanyList()

      expect(result).toEqual(['Tech Corp', 'Data Inc'])
      expect(prisma.server.findMany).toHaveBeenCalledWith({
        where: { company: { not: null } },
        select: { company: true, companyPinyin: true },
        distinct: ['company'],
        orderBy: [
          { companyPinyin: 'asc' },
          { company: 'asc' },
        ],
      })
    })
  })

  describe('getServerById', () => {
    it('should return server with relations', async () => {
      const mockServer = {
        id: 1,
        name: 'Server-01',
        networkInfos: [] as unknown[],
        applications: [] as unknown[],
        fieldValues: [] as unknown[],
      }
      vi.mocked(prisma.server.findUnique).mockResolvedValue(mockServer as never)

      const result = await serverService.getServerById(1)

      expect(result).toEqual(mockServer)
      expect(prisma.server.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      })
    })

    it('should return null for non-existent server', async () => {
      vi.mocked(prisma.server.findUnique).mockResolvedValue(null as never)

      const result = await serverService.getServerById(999)

      expect(result).toBeNull()
    })
  })

  describe('deleteServer', () => {
    it('should delete server by id', async () => {
      vi.mocked(prisma.server.delete).mockResolvedValue({ id: 1 } as never)

      await serverService.deleteServer(1)

      expect(prisma.server.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })
  })
})
