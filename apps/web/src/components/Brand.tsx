import { appPath } from "../lib/routes";

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <a className={small ? "brand brand--small" : "brand"} href="#/" aria-label="CapacityBond home">
      <span className="brand__mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="brand__name">CapacityBond</span>
    </a>
  );
}

export function AppBrand() {
  return (
    <a className="brand brand--app" href={appPath()} aria-label="CapacityBond workspace">
      <span className="brand__mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="brand__name">CapacityBond</span>
      <span className="brand__suffix">workspace</span>
    </a>
  );
}
