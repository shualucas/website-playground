---
name: 3d-interaction-refinement
description: Refine interactive web 3D experiences built with React Three Fiber (R3F) or Three.js. Use when inspecting, diagnosing, planning, or fixing visual polish, physical believability, geometry deformation, material response, camera controls, lighting and shadows, animation timing, interaction responsiveness, or rendering performance in an existing scene.
---

# 3D Interaction Refinement

Improve the existing experience with focused, evidence-based changes. Preserve its intended art direction, content, interaction contract, and accessibility.

## Workflow

1. **Inspect the scene before prescribing changes.** Read repository instructions, package versions, entry points, and available checks. Map geometry/topology and deformation; materials, textures, shaders, and color management; cameras, control pivots, and framing; lighting, environment, and shadow receivers; animation clocks, easing, input handling, and requested versus displayed state. Inspect actual reference source when supplied; distinguish verified techniques from assumptions. Capture a rendered baseline when possible.

2. **Diagnose the highest-impact problems.** Rank at most three issues by visible impact, evidence, likely cause, performance cost, and implementation risk. Mark hypotheses that still need visual confirmation. Separate these causes:

   | System | Diagnostic questions |
   | --- | --- |
   | Modeling/deformation | Are silhouette, scale, thickness, topology, normals, UVs, joints, and contact convincing? Does geometry intersect or change abruptly? |
   | Materials | Do roughness, reflectance, texture scale, transparency, and color space match the intended surface? |
   | Lighting | Do light direction, environment, exposure, shadow bias, and receiver placement explain the visible result? |
   | Camera/interaction | Are perspective, framing, rotation center, hit areas, and drag/click behavior consistent with the intended interaction? |
   | Animation | Are timing, inertia, deformation, layering, input queues, and transitions continuous and believable? |

   Identify the primary cause and any interactions between systems. Avoid using gloss, extra lights, or excessive subdivisions to disguise incorrect form or timing.

3. **Recommend a focused plan before substantial edits.** Propose one to three improvements with expected visual benefit, affected systems, tradeoffs, and observable acceptance criteria. Respect analysis-only requests. Treat explicitly requested or previously selected improvements as authorized scope and proceed after stating the plan; do not require repeated confirmation. Present unselected major changes as options and wait for selection before implementing them.

4. **Implement only the selected improvements.** Keep unrelated styling, content, and behavior intact. Adapt reference techniques to the existing axes, units, lifecycle, and architecture. Introduce dependencies or replace rendering systems only when required by the selected approach. In R3F, animate transient values through refs and the existing frame loop; in imperative Three.js, keep one owned loop. Keep deformation, normals, shadows, bounds, hit testing, and displayed content consistent. Use delta-time-aware motion and deliberate interruption/queue behavior; preserve touch, keyboard access, reduced motion, and reset behavior.

5. **Control rendering cost.** Profile before increasing mesh density, shadow resolution, pixel ratio, or effects. Reuse resources; avoid unnecessary per-frame allocations, React updates, geometry calculations, and duplicate render loops. Clean up owned listeners, animation callbacks, textures, materials, and geometries; respect framework ownership and shared asset caches. Balance fidelity against the target devices and renderer capabilities.

6. **Verify the selected changes.** Run applicable existing type, build, lint, and relevant interaction checks. When browser tools or installed browser automation are available, inspect the rendered result at rest, mid-transition, and after settling, including relevant reverse/underside views and desktop/touch layouts. Check clipping, surface appearance, shadow/deformation agreement, rapid inputs, drag/click separation, and console errors. Add targeted regression coverage for substantive behavioral fixes. If visual inspection is unavailable, state that limitation; a successful build does not establish visual quality.

7. **Report the result candidly.** Summarize selected changes, validation performed, remaining visual limitations, and the single next highest-impact improvement. Separate observed defects from hypotheses and software-renderer artifacts from verified device behavior. Make performance or physical-simulation claims only when supported by evidence.
