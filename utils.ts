// utils.ts

// Helper function to convert data URL to File object
export function dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL format for file conversion.');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

// Helper function to convert remote URL to File object
export async function remoteUrlToFile(url: string, filename: string, mimeType?: string): Promise<File> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch remote URL ${url}: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    return new File([blob], filename, { type: mimeType || blob.type || 'application/octet-stream' });
}

// Combined helper
export async function urlToFile(url: string, filename: string): Promise<File> {
    if (url.startsWith('data:')) {
        return dataURLtoFile(url, filename);
    } else if (url.startsWith('http')) { // Covers https and http
        return remoteUrlToFile(url, filename);
    } else {
        throw new Error('Unsupported URL scheme for file conversion. Must be data URL or http(s).');
    }
}
