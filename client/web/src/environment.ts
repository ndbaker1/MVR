const WS_HOST = typeof window !== 'undefined' ? window.location.hostname + ':42069' : 'localhost:42069';
const BASE_PATH = '';

export {
    WS_HOST,
    BASE_PATH,
};
