import type { CreateLocationInput, LocationRepository } from './repository';

let seedPromise: Promise<void> | null = null;

export function seedSampleLocations(repository: LocationRepository) {
  seedPromise ??= seedMissingSampleLocations(repository).catch((error) => {
    seedPromise = null;
    throw error;
  });

  return seedPromise;
}

async function seedMissingSampleLocations(repository: LocationRepository) {
  const existingLocations = await repository.reader.listLocations();
  const existingKeys = new Set(
    existingLocations.map((location) => createLocationKey(location.name, location.country))
  );

  for (const location of sampleLocations) {
    const key = createLocationKey(location.name ?? null, location.country ?? null);
    if (existingKeys.has(key)) {
      continue;
    }

    await repository.writer.createLocation(location);
    existingKeys.add(key);
  }
}

function createLocationKey(name: string | null, country: string | null) {
  return `${normalizeKey(name)}::${normalizeKey(country)}`;
}

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function samplePhoto(seed: string) {
  return `https://picsum.photos/seed/traveler-${seed}/900/900`;
}

export const sampleLocations: CreateLocationInput[] = [
  {
    name: 'Tokyo Tower',
    country: 'Japan',
    latitude: 35.6586,
    longitude: 139.7454,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Tokyo%20Tower%2C%20Japan',
    notes: 'Sample record. Classic Tokyo skyline stop with city views.',
    photos: [{ uri: samplePhoto('tokyo-tower'), caption: 'Tokyo Tower sample photo' }],
  },
  {
    name: 'Fushimi Inari Taisha',
    country: 'Japan',
    latitude: 34.9671,
    longitude: 135.7727,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fushimi%20Inari%20Taisha%2C%20Japan',
    notes: 'Sample record. Torii gate walk in Kyoto.',
    photos: [{ uri: samplePhoto('fushimi-inari'), caption: 'Fushimi Inari sample photo' }],
  },
  {
    name: 'Arashiyama Bamboo Grove',
    country: 'Japan',
    latitude: 35.017,
    longitude: 135.671,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Arashiyama%20Bamboo%20Grove%2C%20Japan',
    notes: 'Sample record. Early morning bamboo path near western Kyoto.',
    photos: [{ uri: samplePhoto('arashiyama-bamboo'), caption: 'Arashiyama sample photo' }],
  },
  {
    name: 'Kiyomizu-dera',
    country: 'Japan',
    latitude: 34.9949,
    longitude: 135.785,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kiyomizu-dera%2C%20Japan',
    notes: 'Sample record. Temple veranda and hillside streets.',
    photos: [{ uri: samplePhoto('kiyomizudera'), caption: 'Kiyomizu-dera sample photo' }],
  },
  {
    name: 'Mount Fuji',
    country: 'Japan',
    latitude: 35.3606,
    longitude: 138.7274,
    category: 'Nature',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Mount%20Fuji%2C%20Japan',
    notes: 'Sample record. Mountain views from the Fuji Five Lakes area.',
    photos: [{ uri: samplePhoto('mount-fuji'), caption: 'Mount Fuji sample photo' }],
  },
  {
    name: 'Shibuya Crossing',
    country: 'Japan',
    latitude: 35.6595,
    longitude: 139.7005,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Shibuya%20Crossing%2C%20Japan',
    notes: 'Sample record. Busy crossing, cafes, shops, and night lights.',
    photos: [{ uri: samplePhoto('shibuya-crossing'), caption: 'Shibuya sample photo' }],
  },
  {
    name: 'Eiffel Tower',
    country: 'France',
    latitude: 48.8584,
    longitude: 2.2945,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Eiffel%20Tower%2C%20France',
    notes: 'Sample record. Paris landmark and Seine-adjacent walking route.',
    photos: [{ uri: samplePhoto('eiffel-tower'), caption: 'Eiffel Tower sample photo' }],
  },
  {
    name: 'Louvre Museum',
    country: 'France',
    latitude: 48.8606,
    longitude: 2.3376,
    category: 'Museum',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Louvre%20Museum%2C%20France',
    notes: 'Sample record. Major museum anchor for central Paris plans.',
    photos: [{ uri: samplePhoto('louvre'), caption: 'Louvre sample photo' }],
  },
  {
    name: 'Mont Saint-Michel',
    country: 'France',
    latitude: 48.6361,
    longitude: -1.5115,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Mont%20Saint-Michel%2C%20France',
    notes: 'Sample record. Tidal island and abbey in Normandy.',
    photos: [{ uri: samplePhoto('mont-saint-michel'), caption: 'Mont Saint-Michel sample photo' }],
  },
  {
    name: 'Palace of Versailles',
    country: 'France',
    latitude: 48.8049,
    longitude: 2.1204,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Palace%20of%20Versailles%2C%20France',
    notes: 'Sample record. Palace, gardens, and day-trip planning.',
    photos: [{ uri: samplePhoto('versailles'), caption: 'Versailles sample photo' }],
  },
  {
    name: 'Promenade des Anglais',
    country: 'France',
    latitude: 43.6951,
    longitude: 7.2656,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Promenade%20des%20Anglais%2C%20France',
    notes: 'Sample record. Seafront walk in Nice.',
    photos: [{ uri: samplePhoto('promenade-des-anglais'), caption: 'Nice sample photo' }],
  },
  {
    name: 'Aiguille du Midi',
    country: 'France',
    latitude: 45.8786,
    longitude: 6.8873,
    category: 'Nature',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Aiguille%20du%20Midi%2C%20France',
    notes: 'Sample record. Alpine views above Chamonix.',
    photos: [{ uri: samplePhoto('aiguille-du-midi'), caption: 'Aiguille du Midi sample photo' }],
  },
  {
    name: 'Colosseum',
    country: 'Italy',
    latitude: 41.8902,
    longitude: 12.4922,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Colosseum%2C%20Italy',
    notes: 'Sample record. Ancient Rome landmark.',
    photos: [{ uri: samplePhoto('colosseum'), caption: 'Colosseum sample photo' }],
  },
  {
    name: 'Trevi Fountain',
    country: 'Italy',
    latitude: 41.9009,
    longitude: 12.4833,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Trevi%20Fountain%2C%20Italy',
    notes: 'Sample record. Compact stop near central Rome streets.',
    photos: [{ uri: samplePhoto('trevi-fountain'), caption: 'Trevi Fountain sample photo' }],
  },
  {
    name: 'Amalfi Coast',
    country: 'Italy',
    latitude: 40.634,
    longitude: 14.6027,
    category: 'Nature',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Amalfi%20Coast%2C%20Italy',
    notes: 'Sample record. Coastal towns, overlooks, and ferry planning.',
    photos: [{ uri: samplePhoto('amalfi-coast'), caption: 'Amalfi Coast sample photo' }],
  },
  {
    name: 'Rialto Bridge',
    country: 'Italy',
    latitude: 45.438,
    longitude: 12.3359,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rialto%20Bridge%2C%20Italy',
    notes: 'Sample record. Venice canal crossing and nearby markets.',
    photos: [{ uri: samplePhoto('rialto-bridge'), caption: 'Rialto Bridge sample photo' }],
  },
  {
    name: 'Florence Duomo',
    country: 'Italy',
    latitude: 43.7731,
    longitude: 11.256,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Florence%20Duomo%2C%20Italy',
    notes: 'Sample record. Cathedral, dome climb, and historic center.',
    photos: [{ uri: samplePhoto('florence-duomo'), caption: 'Florence Duomo sample photo' }],
  },
  {
    name: 'Cinque Terre',
    country: 'Italy',
    latitude: 44.1461,
    longitude: 9.6439,
    category: 'Nature',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cinque%20Terre%2C%20Italy',
    notes: 'Sample record. Colorful coastal villages and hikes.',
    photos: [{ uri: samplePhoto('cinque-terre'), caption: 'Cinque Terre sample photo' }],
  },
  {
    name: 'Grand Canyon South Rim',
    country: 'United States',
    latitude: 36.0579,
    longitude: -112.1431,
    category: 'Nature',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Grand%20Canyon%20South%20Rim%2C%20United%20States',
    notes: 'Sample record. Viewpoints and sunrise planning.',
    photos: [{ uri: samplePhoto('grand-canyon'), caption: 'Grand Canyon sample photo' }],
  },
  {
    name: 'Yosemite Valley',
    country: 'United States',
    latitude: 37.7456,
    longitude: -119.5936,
    category: 'Nature',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Yosemite%20Valley%2C%20United%20States',
    notes: 'Sample record. Valley hikes, waterfalls, and viewpoints.',
    photos: [{ uri: samplePhoto('yosemite-valley'), caption: 'Yosemite sample photo' }],
  },
  {
    name: 'Golden Gate Bridge',
    country: 'United States',
    latitude: 37.8199,
    longitude: -122.4783,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golden%20Gate%20Bridge%2C%20United%20States',
    notes: 'Sample record. Bridge walk and Marin Headlands viewpoints.',
    photos: [{ uri: samplePhoto('golden-gate'), caption: 'Golden Gate sample photo' }],
  },
  {
    name: 'Times Square',
    country: 'United States',
    latitude: 40.758,
    longitude: -73.9855,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Times%20Square%2C%20United%20States',
    notes: 'Sample record. Midtown transit, theaters, and neon.',
    photos: [{ uri: samplePhoto('times-square'), caption: 'Times Square sample photo' }],
  },
  {
    name: 'Grand Prismatic Spring',
    country: 'United States',
    latitude: 44.525,
    longitude: -110.8382,
    category: 'Nature',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Grand%20Prismatic%20Spring%2C%20United%20States',
    notes: 'Sample record. Yellowstone boardwalk and overlook stop.',
    photos: [{ uri: samplePhoto('grand-prismatic'), caption: 'Grand Prismatic sample photo' }],
  },
  {
    name: 'Angels Landing',
    country: 'United States',
    latitude: 37.2691,
    longitude: -112.9476,
    category: 'Hike',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Angels%20Landing%2C%20United%20States',
    notes: 'Sample record. Zion hiking route and permit reminder.',
    photos: [{ uri: samplePhoto('angels-landing'), caption: 'Angels Landing sample photo' }],
  },
  {
    name: 'Machu Picchu',
    country: 'Peru',
    latitude: -13.1631,
    longitude: -72.545,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Machu%20Picchu%2C%20Peru',
    notes: 'Sample record. Ancient citadel and train/hike logistics.',
    photos: [{ uri: samplePhoto('machu-picchu'), caption: 'Machu Picchu sample photo' }],
  },
  {
    name: 'Huacachina',
    country: 'Peru',
    latitude: -14.0875,
    longitude: -75.7633,
    category: 'Nature',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Huacachina%2C%20Peru',
    notes: 'Sample record. Desert oasis and dune buggy stop.',
    photos: [{ uri: samplePhoto('huacachina'), caption: 'Huacachina sample photo' }],
  },
  {
    name: 'Sacred Valley',
    country: 'Peru',
    latitude: -13.3333,
    longitude: -72.0833,
    category: 'Attraction',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Sacred%20Valley%2C%20Peru',
    notes: 'Sample record. Villages, ruins, and altitude-friendly pacing.',
    photos: [{ uri: samplePhoto('sacred-valley'), caption: 'Sacred Valley sample photo' }],
  },
  {
    name: 'Rainbow Mountain',
    country: 'Peru',
    latitude: -13.8697,
    longitude: -71.3031,
    category: 'Hike',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rainbow%20Mountain%2C%20Peru',
    notes: 'Sample record. High-altitude day hike near Cusco.',
    photos: [{ uri: samplePhoto('rainbow-mountain'), caption: 'Rainbow Mountain sample photo' }],
  },
  {
    name: 'Lake Titicaca',
    country: 'Peru',
    latitude: -15.9254,
    longitude: -69.3354,
    category: 'Nature',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lake%20Titicaca%2C%20Peru',
    notes: 'Sample record. Island visits and lakeside routes.',
    photos: [{ uri: samplePhoto('lake-titicaca'), caption: 'Lake Titicaca sample photo' }],
  },
  {
    name: 'Miraflores',
    country: 'Peru',
    latitude: -12.1211,
    longitude: -77.0297,
    category: 'Neighborhood',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Miraflores%2C%20Peru',
    notes: 'Sample record. Lima cliffside walks, parks, and restaurants.',
    photos: [{ uri: samplePhoto('miraflores'), caption: 'Miraflores sample photo' }],
  },
];
