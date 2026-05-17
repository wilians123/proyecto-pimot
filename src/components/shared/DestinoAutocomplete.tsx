// DestinoAutocomplete.tsx
// Campo de texto con autocompletado de direcciones en Guatemala
// usando la API de Nominatim (OpenStreetMap). Solo devuelve resultados
// dentro de Guatemala (countrycodes=gt + filtro por country_code).
// Soporta teclado (↑ ↓ Enter Escape) y limpieza con botón ✕.
// Ruta: src/components/shared/DestinoAutocomplete.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Bounding box de Guatemala para acotar resultados de Nominatim
const GT_VIEWBOX = "-92.4,17.98,-88.1,13.7";

// Tipo de resultado de Nominatim
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: { country_code?: string };
}

interface DestinoAutocompleteProps {
  /** Valor actual del campo (nombre de lugar seleccionado o texto libre) */
  value: string;
  /** Callback al seleccionar una sugerencia o escribir texto libre */
  onChange: (valor: string) => void;
  /**
   * Callback con las coordenadas del lugar seleccionado.
   * Se llama con null cuando el campo se limpia o el usuario escribe libre.
   */
  onCoordenadasChange?: (coords: { lat: number; lng: number } | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export default function DestinoAutocomplete({
  value,
  onChange,
  onCoordenadasChange,
  disabled = false,
  className = "",
  placeholder = "Ciudad de Guatemala",
}: DestinoAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [sugerencias, setSugerencias] = useState<NominatimResult[]>([]);
  const [cargando, setCargando] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const [abierto, setAbierto] = useState(false);

  // Sincronizar si el padre cambia `value` externamente (ej. al cargar un viaje en edición)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  // Cierra la lista si el usuario hace clic fuera del componente
  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      const target = e.target as Node;
      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        listaRef.current &&
        !listaRef.current.contains(target)
      ) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  // Consulta Nominatim con debounce de 300ms
  const buscar = useCallback(async (texto: string) => {
    if (texto.length < 2) {
      setSugerencias([]);
      setAbierto(false);
      return;
    }

    // Cancelar fetch anterior si sigue en vuelo
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setCargando(true);
    try {
      const params = new URLSearchParams({
        q: texto,
        format: "jsonv2",
        addressdetails: "1",
        limit: "8",
        countrycodes: "gt",
        bounded: "1",
        viewbox: GT_VIEWBOX,
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          signal: abortRef.current.signal,
          headers: { "Accept-Language": "es" },
        },
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as NominatimResult[];

      // Filtro extra para asegurar que sean resultados de Guatemala
      const filtrados = data.filter(
        (r) => (r.address?.country_code ?? "").toLowerCase() === "gt",
      );

      setSugerencias(filtrados);
      setAbierto(filtrados.length > 0);
      setIndiceActivo(-1);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setSugerencias([]);
        setAbierto(false);
      }
    } finally {
      setCargando(false);
    }
  }, []);

  // Dispara la búsqueda con debounce al cambiar el texto
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const texto = e.target.value;
    setQuery(texto);
    onChange(texto); // notifica al padre con el texto libre también

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(texto), 300);
  }

  // Selecciona una sugerencia de la lista.
  // Guarda el display_name completo (dirección exacta con zona, ciudad, etc.).
  // En el input muestra la dirección sin el último token ", Guatemala"
  // (siempre son resultados de Guatemala → es redundante visualmente).
  function seleccionar(item: NominatimResult) {
    const completo = item.display_name;
    const partes = completo.split(", ");
    const sinPais =
      partes[partes.length - 1].trim() === "Guatemala"
        ? partes.slice(0, -1).join(", ")
        : completo;

    setQuery(sinPais);
    onChange(completo);
    // Notificar coordenadas al padre para mostrar el marcador en el mapa
    onCoordenadasChange?.({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    });
    setSugerencias([]);
    setAbierto(false);
    setIndiceActivo(-1);
  }

  // Navegación por teclado
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!abierto || sugerencias.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceActivo((prev) => (prev + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceActivo(
        (prev) => (prev - 1 + sugerencias.length) % sugerencias.length,
      );
    } else if (e.key === "Enter" && indiceActivo >= 0) {
      e.preventDefault();
      seleccionar(sugerencias[indiceActivo]);
    } else if (e.key === "Escape") {
      setAbierto(false);
      setIndiceActivo(-1);
    }
  }

  // Limpia el campo y las coordenadas
  function limpiar() {
    setQuery("");
    onChange("");
    onCoordenadasChange?.(null);
    setSugerencias([]);
    setAbierto(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full">
      {/* Input de búsqueda */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => sugerencias.length > 0 && setAbierto(true)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
        />

        {/* Spinner o botón limpiar */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {cargando ? (
            <span className="w-4 h-4 border-2 border-slate-200 border-t-orange-400 rounded-full animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={limpiar}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer leading-none"
              tabIndex={-1}
              aria-label="Limpiar"
            >
              ✕
            </button>
          ) : (
            // Ícono de mapa cuando está vacío
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-slate-400"
            >
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          )}
        </div>
      </div>

      {/* Lista de sugerencias */}
      {abierto && sugerencias.length > 0 && (
        <ul
          ref={listaRef}
          className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200
            rounded-xl shadow-xl max-h-60 overflow-y-auto py-1"
        >
          {sugerencias.map((item, index) => {
            // Separar nombre del lugar del resto de la dirección
            const partes = item.display_name.split(",");
            const nombre = partes[0].trim();
            const resto = partes.slice(1).join(",").trim();

            return (
              <li
                key={item.place_id}
                onMouseDown={(e) => {
                  e.preventDefault(); // evita que el blur del input cierre la lista antes del click
                  seleccionar(item);
                }}
                onMouseEnter={() => setIndiceActivo(index)}
                className={`flex items-start gap-2.5 px-3.5 py-2.5 cursor-pointer transition-colors
                  ${indiceActivo === index ? "bg-orange-50" : "hover:bg-slate-50"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"
                >
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {nombre}
                  </p>
                  {resto && (
                    <p className="text-xs text-slate-400 truncate">{resto}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
