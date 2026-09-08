import { decryptLong, encryptLong } from "./jsencrypt";

class Storage {
  namespace = "";
  encrypt = false;
  constructor({ namespace, encrypt }: { namespace: string; encrypt?: boolean }) {
    this.namespace = namespace;
    this.encrypt = encrypt || false;
  }

  private getValue(key: string) {
    if (!this.encrypt) return localStorage.getItem(`${this.namespace}-${key}`);

    const value = localStorage.getItem(`${this.namespace}-encrypt-${key}`);
    if (!value) return value;

    return decryptLong(value);
  }

  get(key: string) {
    const value = this.getValue(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch (err) {
        return value;
      }
    }
    return value;
  }

  set(key: string, value: any) {
    const data = JSON.stringify(value);
    if (this.encrypt) {
      localStorage.setItem(`${this.namespace}-encrypt-${key}`, encryptLong(data));
    } else localStorage.setItem(`${this.namespace}-${key}`, data);
  }

  remove(key: string) {
    localStorage.removeItem(`${this.namespace}${this.encrypt ? "-encrypt-" : "-"}${key}`);
  }

  clear() {
    localStorage.clear();
  }
}
const storage = new Storage({ namespace: "online-script", encrypt: true });
export default storage;
