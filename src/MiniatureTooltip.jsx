import React from "react";
import { miniatureDetails } from "./content/miniatures";
export function MiniatureTooltip({ item, onClose }) {
  if (!item || !miniatureDetails[item.id]) return null;
  const detail = miniatureDetails[item.id],
    width = Math.min(250, innerWidth - 24),
    left = Math.max(12, Math.min(innerWidth - width - 12, item.x - width / 2)),
    top = Math.max(12, Math.min(innerHeight - 180, item.y - 130));
  return (
    <aside
      id="miniature-tooltip"
      className={`miniature-tooltip ${item.pinned ? "is-pinned" : ""}`}
      role={item.pinned ? "dialog" : "tooltip"}
      aria-label={detail.title}
      style={{ left, top, width }}
    >
      {item.pinned && (
        <button aria-label="Dismiss miniature description" onClick={onClose}>
          ×
        </button>
      )}
      <h3>{detail.title}</h3>
      <p>{detail.description}</p>
      {detail.action && <span>{detail.action} ↗</span>}
    </aside>
  );
}
