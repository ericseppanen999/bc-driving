import { RegionPreset } from "@/lib/types/domain";

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: "default-view",
    label: "Core + North Shore",
    bbox: { xmin: -123.24, ymin: 49.268, xmax: -123.02, ymax: 49.37 }
  },
  { id: "all", label: "All" },
  {
    id: "downtown",
    label: "Downtown Vancouver",
    bbox: { xmin: -123.145, ymin: 49.268, xmax: -123.09, ymax: 49.295 }
  },
  {
    id: "east-vancouver",
    label: "East Vancouver",
    bbox: { xmin: -123.095, ymin: 49.235, xmax: -123.02, ymax: 49.305 }
  },
  {
    id: "lions-gate",
    label: "Lions Gate",
    bbox: { xmin: -123.18, ymin: 49.285, xmax: -123.095, ymax: 49.335 }
  },
  {
    id: "north-vancouver",
    label: "North Vancouver",
    bbox: { xmin: -123.19, ymin: 49.285, xmax: -122.95, ymax: 49.37 }
  },
  {
    id: "west-vancouver",
    label: "West Vancouver",
    bbox: { xmin: -123.30, ymin: 49.285, xmax: -123.08, ymax: 49.40 }
  },
  {
    id: "burnaby",
    label: "Burnaby",
    bbox: { xmin: -123.08, ymin: 49.21, xmax: -122.9, ymax: 49.31 }
  },
  {
    id: "new-west",
    label: "New Westminster",
    bbox: { xmin: -122.97, ymin: 49.18, xmax: -122.86, ymax: 49.235 }
  },
  {
    id: "richmond",
    label: "Richmond",
    bbox: { xmin: -123.23, ymin: 49.11, xmax: -123.02, ymax: 49.21 }
  },
  {
    id: "highway-1",
    label: "Highway 1",
    roadName: "Highway 1"
  },
  {
    id: "sea-to-sky",
    label: "Sea to Sky",
    roadName: "Highway 99"
  }
];
