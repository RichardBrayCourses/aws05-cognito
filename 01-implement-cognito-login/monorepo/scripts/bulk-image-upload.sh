#!/bin/sh
API_BASE_URL_PARAMETER="/services/api/base-url"
API_BASE_URL="${API_BASE_URL:-$(MSYS_NO_PATHCONV=1 aws ssm get-parameter --name "$API_BASE_URL_PARAMETER" --query "Parameter.Value" --output text)}"
API_BASE_URL="${API_BASE_URL%/}"
PHOTOS_DIR="../../photos-to-upload"

curl -sf -X DELETE "$API_BASE_URL/photos"
echo ""

for photo in "$PHOTOS_DIR"/*; do
  upload_url=$(curl -sf -X POST "$API_BASE_URL/photos/presigned-url")

  if [ -z "$upload_url" ]; then
    echo "Could not get upload URL from $API_BASE_URL/photos/presigned-url"
    exit 1
  fi

  curl -sf -X PUT "$upload_url" \
    -H "Content-Type: image/jpeg" \
    --data-binary @"$photo"
done

photos_response=$(curl -sf "$API_BASE_URL/photos")
photo_count=$(printf "%s" "$photos_response" | grep -o '"id"' | wc -l | tr -d ' ')

echo "Bucket now contains $photo_count photos."
