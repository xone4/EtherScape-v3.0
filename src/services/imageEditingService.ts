const CLIPDROP_API_KEY = 'YOUR_CLIPDROP_API_KEY';

export const inpaintWithClipdrop = async (
  imageFile: string,
  maskFile: Blob
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', await fetch(imageFile).then((r) => r.blob()));
  formData.append('mask_file', maskFile);

  const response = await fetch('https://api.clipdrop.co/v1/inpaint', {
    method: 'POST',
    headers: {
      'x-api-key': CLIPDROP_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to inpaint with Clipdrop');
  }

  const imageBlob = await response.blob();
  return URL.createObjectURL(imageBlob);
};

export const generativeFillWithClipdrop = async (
  imageFile: string,
  maskFile: Blob,
  prompt: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', await fetch(imageFile).then((r) => r.blob()));
  formData.append('mask_file', maskFile);
  formData.append('prompt', prompt);

  const response = await fetch('https://api.clipdrop.co/v1/generative-fill', {
    method: 'POST',
    headers: {
      'x-api-key': CLIPDROP_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to generative fill with Clipdrop');
  }

  const imageBlob = await response.blob();
  return URL.createObjectURL(imageBlob);
};

export const imageToImageWithClipdrop = async (
  imageFile: string,
  prompt: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', await fetch(imageFile).then((r) => r.blob()));
  formData.append('prompt', prompt);

  const response = await fetch('https://api.clipdrop.co/v1/image-to-image', {
    method: 'POST',
    headers: {
      'x-api-key': CLIPDROP_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to image-to-image with Clipdrop');
  }

  const imageBlob = await response.blob();
  return URL.createObjectURL(imageBlob);
};

export const upscaleWithClipdrop = async (
  imageFile: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', await fetch(imageFile).then((r) => r.blob()));

  const response = await fetch('https://api.clipdrop.co/v1/upscale', {
    method: 'POST',
    headers: {
      'x-api-key': CLIPDROP_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upscale with Clipdrop');
  }

  const imageBlob = await response.blob();
  return URL.createObjectURL(imageBlob);
};

export const styleTransferWithClipdrop = async (
  imageFile: string,
  styleId: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', await fetch(imageFile).then((r) => r.blob()));
  formData.append('style_id', styleId);

  const response = await fetch('https://api.clipdrop.co/v1/style-transfer', {
    method: 'POST',
    headers: {
      'x-api-key': CLIPDROP_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to style transfer with Clipdrop');
  }

  const imageBlob = await response.blob();
  return URL.createObjectURL(imageBlob);
};

export const replaceBackgroundWithClipdrop = async (
  imageFile: string,
  prompt: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', await fetch(imageFile).then((r) => r.blob()));
  formData.append('prompt', prompt);

  const response = await fetch('https://api.clipdrop.co/v1/replace-background', {
    method: 'POST',
    headers: {
      'x-api-key': CLIPDROP_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to replace background with Clipdrop');
  }

  const imageBlob = await response.blob();
  return URL.createObjectURL(imageBlob);
};

export const outpaintWithClipdrop = async (
  imageFile: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', await fetch(imageFile).then((r) => r.blob()));

  const response = await fetch('https://api.clipdrop.co/v1/outpaint', {
    method: 'POST',
    headers: {
      'x-api-key': CLIPDROP_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to outpaint with Clipdrop');
  }

  const imageBlob = await response.blob();
  return URL.createObjectURL(imageBlob);
};
