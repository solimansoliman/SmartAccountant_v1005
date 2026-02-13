export interface ParsedGeoAddress {
  cleanAddress: string;
  latitude: string;
  longitude: string;
  hasCoordinates: boolean;
}

const GPS_PATTERN_COLON = /\[\s*GPS\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/i;
const GPS_PATTERN_BRACKETS = /GPS\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/i;

const normalizeCoordinate = (value: number) => value.toFixed(6).replace(/\.?0+$/, '');

const parseCoordinate = (rawValue: string, min: number, max: number): number | null => {
  const trimmedValue = (rawValue || '').trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  if (parsedValue < min || parsedValue > max) {
    return null;
  }

  return parsedValue;
};

const tryExtractCoordinates = (address: string): { latitude: number; longitude: number } | null => {
  const colonMatch = address.match(GPS_PATTERN_COLON);
  if (colonMatch) {
    const latitude = Number(colonMatch[1]);
    const longitude = Number(colonMatch[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  const bracketsMatch = address.match(GPS_PATTERN_BRACKETS);
  if (bracketsMatch) {
    const latitude = Number(bracketsMatch[1]);
    const longitude = Number(bracketsMatch[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
};

export const removeCoordinateTokenFromAddress = (address?: string | null) => {
  const rawAddress = (address || '').trim();
  if (!rawAddress) {
    return '';
  }

  return rawAddress
    .replace(GPS_PATTERN_COLON, '')
    .replace(GPS_PATTERN_BRACKETS, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s\-،,:|]+$/g, '')
    .trim();
};

export const parseAddressCoordinates = (address?: string | null): ParsedGeoAddress => {
  const rawAddress = (address || '').trim();
  if (!rawAddress) {
    return {
      cleanAddress: '',
      latitude: '',
      longitude: '',
      hasCoordinates: false,
    };
  }

  const coordinates = tryExtractCoordinates(rawAddress);
  return {
    cleanAddress: removeCoordinateTokenFromAddress(rawAddress),
    latitude: coordinates ? normalizeCoordinate(coordinates.latitude) : '',
    longitude: coordinates ? normalizeCoordinate(coordinates.longitude) : '',
    hasCoordinates: !!coordinates,
  };
};

export const validateCoordinateInputs = (latitudeText: string, longitudeText: string): {
  isValid: boolean;
  hasCoordinates: boolean;
  latitude?: number;
  longitude?: number;
  message?: string;
} => {
  const hasLatitude = (latitudeText || '').trim().length > 0;
  const hasLongitude = (longitudeText || '').trim().length > 0;

  if (!hasLatitude && !hasLongitude) {
    return {
      isValid: true,
      hasCoordinates: false,
    };
  }

  if (hasLatitude !== hasLongitude) {
    return {
      isValid: false,
      hasCoordinates: false,
      message: 'يجب إدخال خط العرض وخط الطول معاً.',
    };
  }

  const latitude = parseCoordinate(latitudeText, -90, 90);
  if (latitude === null) {
    return {
      isValid: false,
      hasCoordinates: true,
      message: 'خط العرض غير صحيح. القيمة يجب أن تكون بين -90 و 90.',
    };
  }

  const longitude = parseCoordinate(longitudeText, -180, 180);
  if (longitude === null) {
    return {
      isValid: false,
      hasCoordinates: true,
      message: 'خط الطول غير صحيح. القيمة يجب أن تكون بين -180 و 180.',
    };
  }

  return {
    isValid: true,
    hasCoordinates: true,
    latitude,
    longitude,
  };
};

export const composeAddressWithCoordinates = (
  addressText: string,
  latitudeText: string,
  longitudeText: string
) => {
  const normalizedAddress = removeCoordinateTokenFromAddress(addressText);
  const coordinateValidation = validateCoordinateInputs(latitudeText, longitudeText);

  if (!coordinateValidation.isValid || !coordinateValidation.hasCoordinates) {
    return normalizedAddress;
  }

  const latitude = normalizeCoordinate(coordinateValidation.latitude as number);
  const longitude = normalizeCoordinate(coordinateValidation.longitude as number);
  const coordinateToken = `GPS(${latitude},${longitude})`;

  return normalizedAddress ? `${normalizedAddress} - ${coordinateToken}` : coordinateToken;
};

export const buildMapUrl = (latitudeText: string, longitudeText: string, fallbackQuery?: string) => {
  const coordinateValidation = validateCoordinateInputs(latitudeText, longitudeText);
  if (coordinateValidation.isValid && coordinateValidation.hasCoordinates) {
    return `https://www.google.com/maps/search/?api=1&query=${coordinateValidation.latitude},${coordinateValidation.longitude}`;
  }

  const normalizedFallbackQuery = (fallbackQuery || '').trim();
  if (normalizedFallbackQuery) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedFallbackQuery)}`;
  }

  return 'https://www.google.com/maps';
};
