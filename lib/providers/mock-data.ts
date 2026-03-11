import { Camera, TrafficEvent } from "@/lib/types/domain";

export const mockVancouverCameras: Camera[] = [
  {
    id: "vancouver-granville-georgia",
    provider: "vancouver",
    sourceId: "granville-georgia",
    name: "Granville St & Georgia St",
    latitude: 49.2824,
    longitude: -123.1187,
    area: "Downtown Vancouver",
    roadName: "Granville St",
    snippet: "Downtown core camera near Georgia corridor.",
    pageUrl: "https://trafficcams.vancouver.ca/granvillegeorgia.htm",
    imageUrls: [
      { label: "North", url: "https://trafficcams.vancouver.ca/images/granville-georgia-n.jpg" },
      { label: "South", url: "https://trafficcams.vancouver.ca/images/granville-georgia-s.jpg" }
    ],
    imageUrl: "https://trafficcams.vancouver.ca/images/granville-georgia-n.jpg",
    updateIntervalSeconds: 900,
    attribution: "City of Vancouver",
    approximateLocation: true
  },
  {
    id: "vancouver-cambie-broadway",
    provider: "vancouver",
    sourceId: "cambie-broadway",
    name: "Cambie St & Broadway",
    latitude: 49.2626,
    longitude: -123.1151,
    area: "Fairview",
    roadName: "Broadway",
    snippet: "Busy Broadway corridor camera at Cambie.",
    pageUrl: "https://trafficcams.vancouver.ca/cambiebroadway.htm",
    imageUrl: "https://trafficcams.vancouver.ca/images/cambie-broadway.jpg",
    updateIntervalSeconds: 900,
    attribution: "City of Vancouver",
    approximateLocation: true
  }
];

export const mockDriveBcCameras: Camera[] = [
  {
    id: "drivebc-hwy1-cassiar",
    provider: "drivebc",
    sourceId: "hwy1-cassiar",
    name: "Hwy 1 at Cassiar Tunnel",
    latitude: 49.283,
    longitude: -123.031,
    area: "Vancouver",
    roadName: "Highway 1",
    orientation: "West",
    snippet: "Approach to the Cassiar Tunnel westbound on Highway 1.",
    pageUrl: "https://images.drivebc.ca/bchighwaycam/pub/html/www/1.html",
    imageUrl: "https://images.drivebc.ca/bchighwaycam/pub/html/www/1.jpg",
    updateIntervalSeconds: 300,
    attribution: "DriveBC"
  },
  {
    id: "drivebc-sea-to-sky-squamish",
    provider: "drivebc",
    sourceId: "sea-to-sky-squamish",
    name: "Sea to Sky near Squamish",
    latitude: 49.701,
    longitude: -123.157,
    area: "Sea to Sky",
    roadName: "Highway 99",
    orientation: "North",
    snippet: "Sea to Sky corridor conditions near Squamish.",
    pageUrl: "https://images.drivebc.ca/bchighwaycam/pub/html/www/99.html",
    updateIntervalSeconds: 300,
    attribution: "DriveBC"
  }
];

export const mockEvents: TrafficEvent[] = [
  {
    id: "event-hwy1-incident",
    provider: "drivebc",
    sourceId: "evt-1",
    headline: "Vehicle incident affecting westbound traffic",
    description: "Right lane blocked with intermittent delays.",
    eventType: "INCIDENT",
    severity: "MODERATE",
    status: "ACTIVE",
    roadName: "Highway 1",
    latitude: 49.281,
    longitude: -123.03,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    url: "https://www.drivebc.ca"
  },
  {
    id: "event-hwy99-weather",
    provider: "drivebc",
    sourceId: "evt-2",
    headline: "Compact snow between Lions Bay and Squamish",
    description: "Winter tires required. Drive for conditions.",
    eventType: "WEATHER_CONDITION",
    severity: "MINOR",
    status: "ACTIVE",
    roadName: "Highway 99",
    latitude: 49.55,
    longitude: -123.24,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    url: "https://www.drivebc.ca"
  }
];
