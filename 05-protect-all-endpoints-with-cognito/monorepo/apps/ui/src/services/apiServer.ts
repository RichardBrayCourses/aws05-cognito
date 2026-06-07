import { config } from "../config";
import { GetPhotosResponse, PhotoData } from "@/types";
import { ID_TOKEN_STORAGE_KEY } from "@/utils/authStorageKeys";

const getAuthHeaders = () => {
  const idToken = window.localStorage.getItem(ID_TOKEN_STORAGE_KEY);

  if (!idToken) {
    throw new Error("You must be logged in to call the API");
  }

  return {
    Authorization: idToken,
  };
};

export const checkApiServerHealth = async () => {
  const response = await fetch(`${config.apiBaseUrl}/auth/health`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return false;
  }

  const body = await response.text();
  return body.trim() === "Healthy!";
};

const getPhotoUploadUrl = async () => {
  const response = await fetch(`${config.apiBaseUrl}/auth/photos/presigned-url`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Could not start the upload");
  }

  return response.text();
};

export const uploadPhoto = async (file: File) => {
  const uploadUrl = await getPhotoUploadUrl();

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "image/jpeg",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Could not upload the photo");
  }

  return;
};

export const listPhotos = async (): Promise<PhotoData[]> => {
  const response = await fetch(`${config.apiBaseUrl}/auth/photos`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as GetPhotosResponse;

  const photosArray: PhotoData[] = body.photoData;

  return photosArray;
};
