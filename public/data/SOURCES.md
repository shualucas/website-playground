# Geographic data sources

The local map layers are real geographic data, not generated streets or terrain.

- Land: Natural Earth 1:10m countries, via https://github.com/datasets/geo-countries (data/countries.geojson).
- Roads: Natural Earth 1:10m roads, https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_roads.geojson.
- State boundaries: Natural Earth 1:50m admin-1 boundary lines, https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_1_states_provinces_lines.geojson.

Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/.

The files retain genuine coordinates. Features are filtered to North America, US highways, and the three chapter regions, with land/road coordinate precision rounded to five decimal places. Natural Earth is a regional-scale dataset: the local mode does not claim detailed street or building coverage.

High-detail live basemap: OpenFreeMap Positron style, https://tiles.openfreemap.org/styles/positron. Source data is © OpenStreetMap contributors (https://www.openstreetmap.org/copyright); OpenFreeMap provides the tiles and style. Live-source attribution is retained in MapLibre's attribution control. This endpoint requires Internet access but no API key.

City centers used by the story:
- San Francisco: [-122.4194, 37.7749]
- Cumming, Georgia: [-84.1402, 34.2073]
- Irvine, California: [-117.8265, 33.6846]

Pins represent city centers. They are not claimed office, home, or campus addresses. No invented elevations, roads, buildings, career dates, or outcomes are used.
