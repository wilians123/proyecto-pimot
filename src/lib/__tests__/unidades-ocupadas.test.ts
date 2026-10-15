import { obtenerOcupadas } from "@/lib/unidades-ocupadas";

const viajes = [
  { id: "1", cabezal_id: "c1", chasis_id: "h1" },
  { id: "2", cabezal_id: null, chasis_id: "h2" },
  { id: "3", cabezal_id: "c3", chasis_id: null },
];

describe("obtenerOcupadas", () => {
  it("recopila cabezales y chasis ocupados e ignora nulos", () => {
    expect(obtenerOcupadas(viajes)).toEqual({
      cabezales: new Set(["c1", "c3"]),
      chasis: new Set(["h1", "h2"]),
    });
  });

  it("excluye el viaje actual al editar", () => {
    expect(obtenerOcupadas(viajes, "1")).toEqual({
      cabezales: new Set(["c3"]),
      chasis: new Set(["h2"]),
    });
  });
});
