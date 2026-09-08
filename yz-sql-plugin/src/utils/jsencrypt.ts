import JSEncrypt from "jsencrypt/bin/jsencrypt.min";

// 密钥对生成 http://web.chacuo.net/netrsakeypair

//  在JsEncrypt原型上写了分段加密方法 encryptLong 使用时替换encrypt方法即可
JSEncrypt.prototype.encryptLong2 = function (string: string) {
  const keys: string[] = [];
  for (let i = 0; i < string.length; i += 12) {
    const value = string.substring(i, i + 12);
    keys.push(this.encrypt(value));
  }
  return keys.join(":::__:::");
};

JSEncrypt.prototype.decryptLong2 = function (string: string) {
  const keys: string[] = string.split(":::__:::");
  let value = "";
  for (let i = 0; i < keys.length; i++) {
    value += this.decrypt(keys[i]);
  }
  return value;
};

const publicKey =
  "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKoR8mX0rGKLqzcWmOzbfj64K8ZIgOdH\n" +
  "nzkXSOVOZbFu/TJhZ7rFAN+eaGkl3C4buccQd/EjEsj9ir7ijT7h96MCAwEAAQ==";

const privateKey =
  "MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAqhHyZfSsYourNxaY\n" +
  "7Nt+PrgrxkiA50efORdI5U5lsW79MmFnusUA355oaSXcLhu5xxB38SMSyP2KvuKN\n" +
  "PuH3owIDAQABAkAfoiLyL+Z4lf4Myxk6xUDgLaWGximj20CUf+5BKKnlrK+Ed8gA\n" +
  "kM0HqoTt2UZwA5E2MzS4EI2gjfQhz5X28uqxAiEA3wNFxfrCZlSZHb0gn2zDpWow\n" +
  "cSxQAgiCstxGUoOqlW8CIQDDOerGKH5OmCJ4Z21v+F25WaHYPxCFMvwxpcw99Ecv\n" +
  "DQIgIdhDTIqD2jfYjPTY8Jj3EDGPbH2HHuffvflECt3Ek60CIQCFRlCkHpi7hthh\n" +
  "YhovyloRYsM+IS9h/0BzlEAuO0ktMQIgSPT3aFAgJYwKpqRYKlLDVcflZFCKY7u3\n" +
  "UP8iWi1Qw0Y=";

// 加密
export function encrypt(txt: any): string {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(publicKey); // 设置公钥
  return encryptor.encrypt(txt); // 对数据进行加密
}

// 解密
export function decrypt(txt: string): any {
  const encryptor = new JSEncrypt();
  encryptor.setPrivateKey(privateKey); // 设置私钥
  return encryptor.decrypt(txt); // 对数据进行解密
}

export const encryptLong = (Encstr: string) => {
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey(publicKey); // 你的公钥

  const data = encrypt.encryptLong2(Encstr);
  return data;
};

export const decryptLong = (Encstr: string) => {
  const decrypt = new JSEncrypt();
  decrypt.setPrivateKey(privateKey); // 你的私钥
  const data = decrypt.decryptLong2(Encstr);
  return data;
};
