import type { PlacePhotoData } from '../types';

const MAX_PHOTOS = 8;
const MAX_WIDTH = 1400;
const MAX_HEIGHT = 1000;

type PhotoFetchTarget = {
  query: string;
  lat: number;
  lng: number;
  placeId?: string;
};

function uniquePhotos(photos: PlacePhotoData[]) {
  const seen = new Set<string>();
  return photos.filter((photo) => {
    if (!photo.url || seen.has(photo.url)) return false;
    seen.add(photo.url);
    return true;
  }).slice(0, MAX_PHOTOS);
}

function attributionFromAuthors(authors?: google.maps.places.AuthorAttribution[]) {
  if (!authors?.length) return undefined;
  return authors.map((author) => author.displayName).filter(Boolean).join(', ');
}

export function photosFromNewPlace(photos?: google.maps.places.Photo[] | null): PlacePhotoData[] {
  return uniquePhotos((photos ?? []).map((photo) => ({
    url: photo.getURI({ maxWidth: MAX_WIDTH, maxHeight: MAX_HEIGHT }),
    width: photo.widthPx,
    height: photo.heightPx,
    attribution: attributionFromAuthors(photo.authorAttributions),
  })));
}

export function photosFromLegacyPlace(photos?: google.maps.places.PlacePhoto[] | null): PlacePhotoData[] {
  return uniquePhotos((photos ?? []).map((photo) => ({
    url: photo.getUrl({ maxWidth: MAX_WIDTH, maxHeight: MAX_HEIGHT }),
    width: photo.width,
    height: photo.height,
    attributionHtml: photo.html_attributions?.join(' '),
  })));
}

function getLegacyDetailsPhotos(
  service: google.maps.places.PlacesService,
  placeId: string,
) {
  return new Promise<PlacePhotoData[]>((resolve) => {
    service.getDetails(
      {
        placeId,
        fields: ['photos'],
      },
      (result, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
          resolve([]);
          return;
        }
        resolve(photosFromLegacyPlace(result?.photos));
      },
    );
  });
}

function getTextSearchPhotos(target: PhotoFetchTarget) {
  return new Promise<PlacePhotoData[]>((resolve) => {
    if (!google.maps.places?.PlacesService) {
      resolve([]);
      return;
    }

    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const location = new google.maps.LatLng(target.lat, target.lng);

    service.textSearch(
      {
        query: target.query,
        location,
        radius: 5000,
      },
      async (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
          resolve([]);
          return;
        }

        const withPhotos = results.find((result) => result.photos?.length) ?? results[0];
        const directPhotos = photosFromLegacyPlace(withPhotos.photos);
        if (directPhotos.length > 0) {
          resolve(directPhotos);
          return;
        }

        const placeId = withPhotos.place_id;
        resolve(placeId ? await getLegacyDetailsPhotos(service, placeId) : []);
      },
    );
  });
}

async function getPlaceIdPhotos(placeId: string) {
  try {
    const placesLib = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
    if (!placesLib.Place) return [];

    const place = new placesLib.Place({ id: placeId });
    await place.fetchFields({ fields: ['photos'] });
    return photosFromNewPlace(place.photos);
  } catch {
    return [];
  }
}

export async function fetchPlacePhotos(target: PhotoFetchTarget): Promise<PlacePhotoData[]> {
  if (typeof google === 'undefined' || !google.maps?.places) return [];

  if (target.placeId) {
    const placePhotos = await getPlaceIdPhotos(target.placeId);
    if (placePhotos.length > 0) return placePhotos;
  }

  return getTextSearchPhotos(target);
}
