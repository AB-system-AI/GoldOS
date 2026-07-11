import type { PrismaClient } from '@goldos/database';

import { activeOnly, softDeleteData } from './tenant-scope.js';

export class GeoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findCountryById(id: string) {
    return this.prisma.country.findFirst({
      where: { id, ...activeOnly() },
    });
  }

  findCountryByCode(code: string) {
    return this.prisma.country.findFirst({
      where: { code: code.toUpperCase(), ...activeOnly() },
    });
  }

  listCountries(filters?: { isActive?: boolean; skip?: number; take?: number }) {
    return this.prisma.country.findMany({
      where: {
        ...activeOnly(),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  findCityById(id: string) {
    return this.prisma.city.findFirst({
      where: { id, ...activeOnly() },
      include: { country: true },
    });
  }

  listCities(filters?: {
    countryId?: string;
    isActive?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.city.findMany({
      where: {
        ...activeOnly(),
        ...(filters?.countryId ? { countryId: filters.countryId } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters?.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
      },
      include: { country: true },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  softDeleteCountry(id: string) {
    return this.prisma.country.updateMany({
      where: { id, ...activeOnly() },
      data: softDeleteData(),
    });
  }

  softDeleteCity(id: string) {
    return this.prisma.city.updateMany({
      where: { id, ...activeOnly() },
      data: softDeleteData(),
    });
  }
}
