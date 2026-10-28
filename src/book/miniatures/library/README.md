# Archived project miniatures

`previous-project-scenes.ts` preserves the earlier Stadia console/gamepad/cloud and AI card/orbit/chip scenes as `PreviousProjectScenes`. It is deliberately not imported by the running book. The active `PagePopups` only creates career and After-hours objects.

To restore a project prop, extract its factory into a module here, return a named `THREE.Group`, and register each visible mesh through the active `PagePopups` registration callback. Anchor it to that project's right leaf and attach one `JellyCage` to its content group. Use the existing `PagePopups.step` lifecycle so it retracts before turns, respects reduced motion, and disposes materials with the book. Do not instantiate the archived controller alongside the active one: that would duplicate About and its animation lifecycle.
