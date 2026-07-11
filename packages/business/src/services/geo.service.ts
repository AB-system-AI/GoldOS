import type { GeoRepository } from '../repositories/geo.repository.js';
import { assertFound } from './validation.js';

export class GeoService {
  constructor(private readonly geoRepository: GeoRepository) {}

  getCountryById(id: string) {
    return assertFound(this.geoRepository.findCountryById(id), 'Country not found');
  }

  getCountryByCode(code: string) {
    return assertFound(this.geoRepository.findCountryByCode(code), 'Country not found');
  }

  listCountries(filters?: Parameters<GeoRepository['listCountries']>[0]) {
    return this.geoRepository.listCountries(filters);
  }

  getCityById(id: string) {
    return assertFound(this.geoRepository.findCityById(id), 'City not found');
  }

  listCities(filters?: Parameters<GeoRepository['listCities']>[0]) {
    return this.geoRepository.listCities(filters);
  }
}
