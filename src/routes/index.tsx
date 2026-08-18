import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Crosshair,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Navigation,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Minha Localização" },
      { name: "description", content: "Descubra e visualize sua localização atual com precisão." },
      { property: "og:title", content: "Minha Localização" },
      { property: "og:description", content: "Descubra e visualize sua localização atual com precisão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface GeoError {
  message: string;
  code?: number;
}

function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Permissão negada. Permitua o acesso à localização nas configurações do navegador.";
    case error.POSITION_UNAVAILABLE:
      return "Não foi possível obter a localização no momento.";
    case error.TIMEOUT:
      return "A solicitação de localização demorou demais.";
    default:
      return "Ocorreu um erro desconhecido ao obter a localização.";
  }
}

function Index() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<GeoError | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [watching, setWatching] = useState(false);

  const copyCoordinates = useCallback(async () => {
    if (!location) return;
    const text = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [location]);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    });
    setError(null);
    setLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError({ message: getErrorMessage(err), code: err.code });
    setLoading(false);
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({ message: "Seu navegador não suporta geolocalização." });
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  }, [handleSuccess, handleError]);

  useEffect(() => {
    if (!watching || !navigator.geolocation) return;
    setLoading(true);
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [watching, handleSuccess, handleError]);

  const formattedDate = location
    ? new Date(location.timestamp).toLocaleString("pt-BR", {
        dateStyle: "medium",
        timeStyle: "medium",
      })
    : null;

  const mapsUrl = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
              Minha Localização
            </h1>
            <p className="text-sm text-muted-foreground">
              Obtenha suas coordenadas atuais
            </p>
          </div>
        </div>

        {!location && !error && (
          <div className="mb-6 rounded-xl bg-muted/50 p-6 text-center">
            <Crosshair className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Toque no botão abaixo para permitir o acesso à sua localização.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Não foi possível obter a localização</p>
              <p className="mt-1 opacity-90">{error.message}</p>
            </div>
          </div>
        )}

        {location && (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Latitude
                </p>
                <p className="mt-1 text-lg font-semibold text-card-foreground">
                  {location.latitude.toFixed(6)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Longitude
                </p>
                <p className="mt-1 text-lg font-semibold text-card-foreground">
                  {location.longitude.toFixed(6)}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Precisão
                  </p>
                  <p className="mt-1 text-lg font-semibold text-card-foreground">
                    ±{Math.round(location.accuracy)} metros
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Navigation className="h-5 w-5" />
                </div>
              </div>
            </div>

            {formattedDate && (
              <p className="text-center text-xs text-muted-foreground">
                Atualizado em {formattedDate}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={getLocation}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Obtendo localização...
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                {location ? "Atualizar localização" : "Obter localização"}
              </>
            )}
          </button>

          {location && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={copyCoordinates}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
              <a
                href={mapsUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" />
                Ver no mapa
              </a>
            </div>
          )}

          <label className="flex cursor-pointer items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={watching}
              onChange={(e) => setWatching(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Atualizar automaticamente
          </label>
        </div>
      </div>
    </main>
  );
}
