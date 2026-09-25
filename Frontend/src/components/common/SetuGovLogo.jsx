import React from "react";

/**
 * Official SetuGov Brand Logo Icon
 * Renders the official bridge & governance platform icon.
 */
export function SetuGovLogoIcon({ className = "h-10 w-10 object-contain rounded-xl" }) {
  return (
    <img
      src="/setugov-logo.png"
      alt="SetuGov Logo"
      className={className}
    />
  );
}

export default SetuGovLogoIcon;
