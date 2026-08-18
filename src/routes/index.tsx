import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  MapPin,
  Crosshair,
  AlertCircle,
  ExternalLink,
  Phone,
  Globe,
  Ambulance,
  Hospital as HospitalIcon,
} from "lucide-react";

import { fetchNearbyHospitals, type Hospital } from "../lib/hospitals";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Hospitais Perto de Mim" },
      {
        name: "description",
        content:
          "Encontre hospitais e clínicas próximos da sua localização atual, com nome, endereço, telefone e distância.",
      },
      { property: "og:title", content: "Hospitais Perto de Mim" },
      {
        property: "og:description",
        content:
          "Encontre hospitais e clínicas próximos da sua localização atual, com nome, endereço, telefone e distância.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function geoErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Permissão negada. Libere o acesso à localização no navegador.";
    case error.POSITION_UNAVAILABLE:
      return "Não foi possível obter a localização no momento.";
    case error.TIMEOUT:
      return "A solicitação de localização demorou demais.";
    default:
      return "Erro desconhecido ao obter a localização.";
  }
}

const RADIUS_OPTIONS = [2000, 5000, 10000];

function Index() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(5000);

  const search = useCallback(
    (nextRadius = radius) => {
      if (!navigator.geolocation) {
        setError("Seu navegador não suporta geolocalização.");
        return;
      }
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCoords({ lat, lon });
          try {
            const result = await fetchNearbyHospitals(lat, lon, nextRadius);
            setHospitals(result);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Falha na busca.");
            setHospitals(null);
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          setError(geoErrorMessage(err));
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    },
    [radius],
  );

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HospitalIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Hospitais perto de mim
            </h1>
            <p className="text-sm text-muted-foreground">
              Usa sua localização para listar hospitais e clínicas próximos
            </p>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRadius(r);
                  if (coords) search(r);
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  radius === r
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {r / 1000} km
              </button>
            ))}
          </div>

          <button
            onClick={() => search()}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Buscando...
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                {hospitals ? "Buscar novamente" : "Buscar hospitais próximos"}
              </>
            )}
          </button>

          {coords && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Sua posição: {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
            </p>
          )}
        </section>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {hospitals && hospitals.length === 0 && !loading && (
          <p className="rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            Nenhum hospital encontrado nesse raio. Tente aumentar a distância.
          </p>
        )}

        {hospitals && hospitals.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {hospitals.length} resultado(s) encontrados
            </p>
            {hospitals.map((h) => (
              <article
                key={h.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <img
                  src={h.imageUrl}
                  alt={`Localização de ${h.name} no mapa`}
                  loading="lazy"
                  className="h-40 w-full bg-muted object-cover"
                />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-semibold text-card-foreground">{h.name}</h2>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {h.distanceKm < 1
                        ? `${Math.round(h.distanceKm * 1000)} m`
                        : `${h.distanceKm.toFixed(1)} km`}
                    </span>
                  </div>

                  <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {h.address}
                  </p>

                  {h.emergency && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                      <Ambulance className="h-3.5 w-3.5" />
                      Pronto-socorro
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {h.phone && (
                      <a
                        href={`tel:${h.phone}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                      >
                        <Phone className="h-4 w-4" />
                        {h.phone}
                      </a>
                    )}
                    {h.website && (
                      <a
                        href={h.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                      >
                        <Globe className="h-4 w-4" />
                        Site
                      </a>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Como chegar
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Dados de hospitais: OpenStreetMap (Overpass API). Localização: Geolocation API do navegador.
        </p>
      </div>
    </main>
  );
}
