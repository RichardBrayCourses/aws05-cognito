import Preview from "@/components/Preview";
import { Input } from "@/components/ui/input";
import { photos } from "@/data/photos";
import { listPhotos } from "@/services/apiServer";
import { PhotoData } from "@/types";
import { useEffect, useState } from "react";

function transformer(
  photo: PhotoData,
  index: number,
  setSelectedPhoto: (photo: PhotoData | null) => void,
) {
  return (
    <button
      key={index}
      type="button"
      className="mb-6 break-inside-avoid rounded-xl overflow-hidden group relative text-left"
      onClick={() => setSelectedPhoto(photo)}
    >
      <img
        src={index % 2 === 0 ? photo.small : photo.large}
        alt={photo.title}
        className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 duration-700 ">
        <div className="text-white text-sm font-semibold">{photo.title}</div>
        <div className="text-white/80 text-xs">{photo.description}</div>
      </div>
    </button>
  );
}

const noMatches = () => (
  <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
    No matches. Try a different search.
  </div>
);

const match = (photo: PhotoData, query: string): boolean => {
  const titleMatch = photo.title.trim().toLowerCase().includes(query);
  const descriptionMatch = photo.description
    .trim()
    .toLowerCase()
    .includes(query);
  return titleMatch || descriptionMatch;
};

const Home = () => {
  const [searchText, setSearchText] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [bucketPhotos, setBucketPhotos] = useState<PhotoData[] | null>(null);

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const photos = await listPhotos();
        setBucketPhotos(photos);
      } catch {
        setBucketPhotos([]);
      }
    };

    loadPhotos();
  }, []);

  if (bucketPhotos === null) {
    return <div className="max-w-5xl mx-auto p-4 pt-0">Loading...</div>;
  }

  const query = searchText.trim().toLowerCase();
  const filtered = bucketPhotos.length
    ? bucketPhotos
    : photos.filter((photo) => match(photo, query));

  const transformedImages = filtered.map((photo: PhotoData, index: number) =>
    transformer(photo, index, setSelectedPhoto),
  );

  return (
    <div className="max-w-5xl mx-auto p-4 pt-0">
      <Input
        className="mb-6"
        value={searchText}
        onChange={(event) => {
          setSearchText(event.target.value);
        }}
      />
      {query && !filtered.length && noMatches()}

      {!selectedPhoto && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-x-6">
          {transformedImages}
        </div>
      )}

      {selectedPhoto && (
        <Preview
          selectedPhoto={selectedPhoto}
          setSelectedPhoto={setSelectedPhoto}
        />
      )}
    </div>
  );
};

export default Home;
