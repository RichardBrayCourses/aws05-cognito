export type PhotoData = {
  id: string;
  title: string;
  description: string;
  small: string;
  large: string;
};

export type GetPhotosResponse = {
  photoData: PhotoData[];
};

export type AuthenticatedUser = {
  sub: string | null;
  email: string | null;
  emailVerified: boolean | null;
};
