/**
 * The CSRF token the server sends on sign-in. Kept in sessionStorage (per
 * tab, cleared with it) and sent back in the header of the same name.
 */
export class CsrfService {
    /** Response header carrying the token, and request header returning it. */
    static readonly HEADER = 'X-CSRF-TOKEN';
    private static readonly TOKEN_KEY = CsrfService.HEADER;

    static saveToken(token: string): void {
        sessionStorage.setItem(this.TOKEN_KEY, token);
    }

    static getToken(): string | null {
        return sessionStorage.getItem(this.TOKEN_KEY);
    }

    static clearToken(): void {
        sessionStorage.removeItem(this.TOKEN_KEY);
    }
}

export default CsrfService;
