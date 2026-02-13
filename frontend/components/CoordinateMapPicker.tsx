import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';

type CoordinateMapPickerProps = {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
  label?: string;
  className?: string;
};

const DEFAULT_LATITUDE = 24.713552;
const DEFAULT_LONGITUDE = 46.675297;

const parseCoordinate = (value: string, min: number, max: number): number | null => {
  const normalizedValue = (value || '').trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  if (parsedValue < min || parsedValue > max) {
    return null;
  }

  return parsedValue;
};

const RecenterMap = ({ latitude, longitude }: { latitude: number | null; longitude: number | null }) => {
  const map = useMap();

  useEffect(() => {
    if (latitude === null || longitude === null) {
      return;
    }

    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 13), {
      duration: 0.8,
    });
  }, [latitude, longitude, map]);

  return null;
};

const MapClickEvents = ({ onPick }: { onPick: (latitude: number, longitude: number) => void }) => {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
};

const CoordinateMapPicker: React.FC<CoordinateMapPickerProps> = ({ latitude, longitude, onChange, label, className }) => {
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  const parsedLatitude = parseCoordinate(latitude, -90, 90);
  const parsedLongitude = parseCoordinate(longitude, -180, 180);

  const selectedPosition =
    parsedLatitude !== null && parsedLongitude !== null
      ? ([parsedLatitude, parsedLongitude] as [number, number])
      : null;

  const initialCenter = useMemo<[number, number]>(() => {
    if (selectedPosition) {
      return selectedPosition;
    }

    return [DEFAULT_LATITUDE, DEFAULT_LONGITUDE];
  }, [selectedPosition]);

  const resolvedLabel = (label || '').trim();

  const handleLocateCurrentPosition = () => {
    setLocateError('');

    if (!navigator.geolocation) {
      setLocateError('المتصفح لا يدعم خدمة تحديد الموقع.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(position.coords.latitude.toFixed(6), position.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      () => {
        setLocateError('تعذر تحديد الموقع الحالي. تأكد من منح صلاحية الموقع.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div className={className || 'w-full'}>
      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600">
        <button
          type="button"
          onClick={handleLocateCurrentPosition}
          disabled={isLocating}
          className="absolute right-2 top-2 z-[500] rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-white disabled:opacity-60 dark:bg-slate-800/95 dark:text-slate-100 dark:ring-slate-600"
        >
          {isLocating ? 'جار التحديد...' : 'موقعي'}
        </button>

        <MapContainer center={initialCenter} zoom={selectedPosition ? 14 : 6} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickEvents
            onPick={(nextLatitude, nextLongitude) => {
              onChange(nextLatitude.toFixed(6), nextLongitude.toFixed(6));
            }}
          />

          <RecenterMap latitude={parsedLatitude} longitude={parsedLongitude} />

          {selectedPosition && (
            <CircleMarker
              center={selectedPosition}
              radius={9}
              pathOptions={{ color: '#0ea5e9', fillColor: '#0284c7', fillOpacity: 0.45, weight: 3 }}
            >
              <Popup>
                <div className="text-xs leading-5">
                  <p className="font-semibold text-slate-800">{resolvedLabel || 'الموقع المحدد'}</p>
                  <p dir="ltr" className="text-slate-600">
                    {parsedLatitude?.toFixed(6)}, {parsedLongitude?.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>

      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        انقر على الخريطة لاختيار الموقع. سيتم تعبئة خط العرض وخط الطول تلقائيا.
      </p>
      {locateError && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{locateError}</p>}
    </div>
  );
};

export default CoordinateMapPicker;
