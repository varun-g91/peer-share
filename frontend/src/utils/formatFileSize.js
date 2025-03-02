export const formatFileSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const result = bytes / Math.pow(k, i);

    if (typeof decimals !== 'number' || decimals < 0 || decimals > 100) {
        decimals = 2; 
    }

    return parseFloat(result.toFixed(decimals)) + ' ' + sizes[i];
};