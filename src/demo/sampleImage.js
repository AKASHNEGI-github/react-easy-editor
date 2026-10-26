// Draws a small landscape on a canvas and returns it as a PNG File, so the "Insert a sample image"
// button can hand the editor a real file without the site shipping an image asset.
export function makeSampleImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const g = canvas.getContext('2d');

  const sky = g.createLinearGradient(0, 0, 0, 360);
  sky.addColorStop(0, '#dce6fb');
  sky.addColorStop(1, '#f3f6fd');
  g.fillStyle = sky;
  g.fillRect(0, 0, 640, 360);

  g.fillStyle = '#ffe15a';
  g.beginPath();
  g.arc(470, 110, 46, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = '#8aa8ff';
  g.beginPath();
  g.moveTo(0, 360);
  g.lineTo(190, 150);
  g.lineTo(360, 360);
  g.closePath();
  g.fill();

  g.fillStyle = '#2552c8';
  g.beginPath();
  g.moveTo(200, 360);
  g.lineTo(420, 190);
  g.lineTo(640, 360);
  g.closePath();
  g.fill();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], 'sample-landscape.png', { type: 'image/png' })) : reject(new Error('Could not create the sample image'))),
      'image/png',
    );
  });
}

// Feeds a file to the editor the same way dropping it from the desktop would, so it goes through the
// real pipeline: instant placeholder, then onImageUpload, then the final address.
export async function dropSampleImage(contentElement) {
  const file = await makeSampleImage();
  const transfer = new DataTransfer();
  transfer.items.add(file);
  contentElement.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
}
